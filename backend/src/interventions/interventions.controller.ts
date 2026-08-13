import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards, forwardRef } from '@nestjs/common';
import { Request } from 'express';
import { InterventionsService, InterventionFilters } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { DuplicateInterventionDto } from './dto/duplicate-intervention.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SetSignatureDto } from './dto/set-signature.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalsService, ApprovalActionType } from '../approvals/approvals.service';

@Controller('interventions')
export class InterventionsController {
  constructor(
    private readonly service: InterventionsService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvals: ApprovalsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get()
  list(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('siteId') siteId?: string,
    @Query('type') type?: string,
    @Query('subType') subType?: string,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    const user = req.user as any;
    const filters: InterventionFilters = {
      startDate,
      endDate,
      siteId,
      type: (type as any) ?? 'all',
      subType,
      agentId: agentId ?? (user?.role === 'AGENT' ? user.sub : undefined),
      status: (status as any) ?? 'all',
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    };
    return this.service.list(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get('next')
  getNextForUser(@Req() req: Request) {
    const user = req.user as any;
    return this.service.getNextInterventionForUser(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get('route-optimization')
  getRouteOptimization(@Req() req: Request, @Query('userId') userId?: string, @Query('date') date?: string) {
    const user = req.user as any;
    const targetUserId = user.role === 'AGENT' ? user.sub : userId;
    if (!targetUserId || !date) {
      return { userId: targetUserId, date, stops: [], totalDistanceMeters: 0 };
    }
    return this.service.getRouteOptimization(targetUserId, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('estimate-duration')
  estimateDuration(@Query('siteId') siteId: string, @Query('type') type?: string) {
    return this.service.estimateDuration(siteId, type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id')
  detail(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.service.findOne(id, { id: user.sub, role: user.role });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post()
  create(@Body() dto: CreateInterventionDto, @Req() req: Request) {
    const user = req.user as any;
    if (user.role === 'SUPERVISOR') {
      return this.approvals.createRequest({
        actionType: 'CREATE_INTERVENTION',
        entityType: 'Intervention',
        entityId: null,
        payload: dto as unknown as Record<string, unknown>,
        requestedById: user.sub,
        summary: `${dto.date} ${dto.startTime}–${dto.endTime}`,
      });
    }
    return this.service.create(dto, user.sub);
  }

  /**
   * Création ponctuelle multi-arrêts (un ou plusieurs sites, une seule fois) — utilisée par le
   * formulaire unique de création quand plusieurs arrêts sont ajoutés en une soumission.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('batch')
  createOneshotBatch(@Body('occurrences') occurrences: any[], @Req() req: Request) {
    if (!Array.isArray(occurrences) || !occurrences.length) {
      throw new BadRequestException('Au moins un arrêt est requis.');
    }
    const user = req.user as any;
    if (user.role === 'SUPERVISOR') {
      return this.approvals.createRequest({
        actionType: 'CREATE_INTERVENTION',
        entityType: 'Intervention',
        entityId: null,
        payload: { occurrences },
        requestedById: user.sub,
        summary: `${occurrences.length} intervention(s)`,
      });
    }
    return this.service.createOneshotBatch(occurrences, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateInterventionDto, @Req() req: Request) {
    const user = req.user as any;
    const touchesSchedule = dto.date !== undefined || dto.startTime !== undefined || dto.endTime !== undefined;
    const touchesAgents = dto.agentIds !== undefined;

    if (user.role === 'SUPERVISOR' && !dto.status && (touchesSchedule || touchesAgents)) {
      const original = await this.service.findOne(id, { id: user.sub, role: user.role });
      let actionType: ApprovalActionType = 'UPDATE_INTERVENTION_SCHEDULE';
      if (touchesAgents && !touchesSchedule) {
        const before = new Set(original.agentIds);
        const after = new Set(dto.agentIds ?? []);
        const added = [...after].filter((x) => !before.has(x)).length;
        const removed = [...before].filter((x) => !after.has(x)).length;
        actionType = added >= removed ? 'ASSIGN_AGENT' : 'UNASSIGN_AGENT';
      }
      const summary = touchesSchedule
        ? `${dto.date ?? original.date} ${dto.startTime ?? original.startTime}–${dto.endTime ?? original.endTime}`
        : `${(dto.agentIds ?? []).length} agent(s) assigné(s)`;
      return this.approvals.createRequest({
        actionType,
        entityType: 'Intervention',
        entityId: id,
        payload: dto as unknown as Record<string, unknown>,
        previousState: {
          date: original.date,
          startTime: original.startTime,
          endTime: original.endTime,
          agentIds: original.agentIds,
        },
        requestedById: user.sub,
        summary,
      });
    }

    return this.service.update(id, dto, user?.sub, user?.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: Request) {
    const user = req.user as any;
    return this.service.updateStatus(id, status as any, { id: user.sub, role: user.role });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @Body() dto: DuplicateInterventionDto, @Req() req: Request) {
    return this.service.duplicate(id, dto, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body('observation') observation: string, @Req() req: Request) {
    const user = req.user as any;
    if (user.role === 'SUPERVISOR') {
      const original = await this.service.findOne(id, { id: user.sub, role: user.role });
      return this.approvals.createRequest({
        actionType: 'CANCEL_INTERVENTION',
        entityType: 'Intervention',
        entityId: id,
        payload: { observation },
        previousState: { status: original.status },
        requestedById: user.sub,
        summary: observation,
      });
    }
    return this.service.cancel(id, observation, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('templates/list')
  listTemplates() {
    return this.service.listTemplates();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch('templates/:id/toggle')
  toggleTemplate(@Param('id') id: string, @Body('active') active: boolean) {
    return this.service.toggleTemplate(id, active);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get('templates/:id/preview')
  previewTemplate(@Param('id') id: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.service.previewTemplateOccurrences(id, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('templates/:id/generate')
  async generateTemplate(
    @Param('id') id: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const preview = await this.service.previewTemplateOccurrences(id, startDate, endDate);
    if (!preview.occurrences.length) {
      throw new BadRequestException('Aucune occurrence à générer sur cette période.');
    }
    const payload = {
      templateId: preview.templateId,
      templateLabel: preview.templateLabel,
      occurrences: preview.occurrences.map(({ date, siteId, startTime, endTime, agentIds }) => ({
        date,
        siteId,
        startTime,
        endTime,
        agentIds,
      })),
    };
    if (user.role === 'SUPERVISOR') {
      return this.approvals.createRequest({
        actionType: 'CREATE_TEMPLATE_BATCH',
        entityType: 'InterventionTemplate',
        entityId: id,
        payload,
        requestedById: user.sub,
        summary: `${preview.occurrences.length} occurrence(s) — ${preview.templateLabel}`,
      });
    }
    return this.service.createTemplateBatch(payload, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Get(':id/checklist')
  listChecklist(@Param('id') id: string) {
    return this.service.listChecklist(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Patch(':id/checklist/:itemId')
  toggleChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('done') done: boolean,
    @Req() req: Request,
  ) {
    return this.service.toggleChecklistItem(id, itemId, done, (req.user as any)?.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Get(':id/assignment-suggestions')
  getAssignmentSuggestions(@Param('id') id: string) {
    return this.service.getAssignmentSuggestions(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'AGENT')
  @Post(':id/signature')
  setClientSignature(@Param('id') id: string, @Body() dto: SetSignatureDto, @Req() req: Request) {
    return this.service.setClientSignature(id, dto.signature, (req.user as any)?.sub);
  }
}
