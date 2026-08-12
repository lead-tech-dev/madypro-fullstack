import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards, forwardRef } from '@nestjs/common';
import { Request } from 'express';
import { InterventionsService, InterventionFilters } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';
import { DuplicateInterventionDto } from './dto/duplicate-intervention.dto';
import { CreateInterventionRuleDto } from './dto/create-rule.dto';
import { UpdateInterventionRuleDto } from './dto/update-rule.dto';
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
  @Get('rules/list')
  listRules() {
    return this.service.listRules();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Post('rules')
  createRule(@Body() dto: CreateInterventionRuleDto) {
    return this.service.createRule(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateInterventionRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  @Patch('rules/:id/toggle')
  toggleRule(@Param('id') id: string, @Body('active') active: boolean) {
    return this.service.toggleRule(id, active);
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
