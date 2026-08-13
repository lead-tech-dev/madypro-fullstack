import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards, forwardRef } from '@nestjs/common';
import { Request } from 'express';
import { ApprovalsService } from './approvals.service';
import { InterventionsService } from '../interventions/interventions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RejectApprovalDto } from './dto/reject-approval.dto';

@Controller('approval-requests')
export class ApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    @Inject(forwardRef(() => InterventionsService))
    private readonly interventionsService: InterventionsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  list(
    @Query('status') status?: string,
    @Query('requestedById') requestedById?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.approvals.list({
      status,
      requestedById,
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 50,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    const request = await this.approvals.findPending(id);
    try {
      await this.applyRequest(request, user.sub);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Application impossible';
      await this.approvals.markRejected(id, null, `Rejet automatique : ${message}`);
      throw new BadRequestException(`Impossible d'appliquer la demande : ${message}`);
    }
    return this.approvals.markApproved(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectApprovalDto, @Req() req: Request) {
    const user = req.user as any;
    return this.approvals.markRejected(id, user.sub, dto.comment);
  }

  private async applyRequest(
    request: { actionType: string; entityId: string | null; payload: unknown },
    reviewerId: string,
  ) {
    const payload = request.payload as any;
    switch (request.actionType) {
      case 'CREATE_INTERVENTION':
        return this.interventionsService.create(payload, reviewerId);
      case 'UPDATE_INTERVENTION_SCHEDULE':
      case 'ASSIGN_AGENT':
      case 'UNASSIGN_AGENT':
        if (!request.entityId) throw new Error('Intervention manquante');
        return this.interventionsService.update(request.entityId, payload, reviewerId, 'SUPERVISOR');
      case 'CANCEL_INTERVENTION':
        if (!request.entityId) throw new Error('Intervention manquante');
        return this.interventionsService.cancel(request.entityId, payload.observation, reviewerId);
      case 'CREATE_RECURRING_BATCH':
        return this.interventionsService.createBatch(payload, reviewerId);
      case 'CREATE_TOUR_BATCH':
        return this.interventionsService.createTourBatch(payload, reviewerId);
      default:
        throw new Error('Type d’action non pris en charge');
    }
  }
}
