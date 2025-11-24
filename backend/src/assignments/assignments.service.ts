import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentEntity } from './entities/assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UsersService } from '../users/users.service';
import { SitesService } from '../sites/sites.service';

type AssignmentFilters = {
  userId?: string;
  siteId?: string;
  dayOfWeek?: number;
};

type AssignmentView = AssignmentEntity & {
  user: { id: string; name: string; role: string };
  site: { id: string; name: string; clientName: string; address: string };
};

@Injectable()
export class AssignmentsService {
  private assignments: AssignmentEntity[] = [];

  constructor(
    private readonly usersService: UsersService,
    private readonly sitesService: SitesService,
  ) {
    this.bootstrap();
  }

  private bootstrap() {
    this.assignments = [
      {
        id: 'assign-atelier-lucas',
        userId: '3',
        siteId: 'site-atelier',
        dayOfWeek: 0,
        startTime: '06:00',
        endTime: '14:00',
        createdAt: new Date(),
      },
      {
        id: 'assign-viva-imen',
        userId: '5',
        siteId: 'site-viva',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
        createdAt: new Date(),
      },
      {
        id: 'assign-terrasse-valerie',
        userId: '4',
        siteId: 'site-terrasse',
        dayOfWeek: 2,
        startTime: '05:00',
        endTime: '12:00',
        createdAt: new Date(),
      },
    ];
  }

  private ensureAssignment(id: string) {
    const assignment = this.assignments.find((item) => item.id === id);
    if (!assignment) {
      throw new NotFoundException('Affectation introuvable');
    }
    return assignment;
  }

  private ensureAgent(userId: string) {
    const user = this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('Agent introuvable');
    }
    if (!user.active) {
      throw new BadRequestException('Agent inactif');
    }
    if (user.role !== 'AGENT') {
      throw new BadRequestException("Seuls les agents peuvent être planifiés");
    }
    return user;
  }

  private ensureSite(siteId: string) {
    const site = this.sitesService.findOne(siteId);
    if (!site.active) {
      throw new BadRequestException('Le site est inactif');
    }
    return site;
  }

  private validateTimes(start: string, end: string) {
    if (start >= end) {
      throw new BadRequestException("L'heure de fin doit être supérieure à l'heure de début");
    }
  }

  private present(assignment: AssignmentEntity): AssignmentView {
    const user = this.ensureAgent(assignment.userId);
    const site = this.ensureSite(assignment.siteId);
    return {
      ...assignment,
      user: { id: user.id, name: user.name, role: user.role },
      site: {
        id: site.id,
        name: site.name,
        clientName: site.clientName,
        address: site.address,
      },
    };
  }

  findAll(filters: AssignmentFilters = {}) {
    return this.assignments
      .filter((assignment) => {
        if (filters.userId && assignment.userId !== filters.userId) return false;
        if (filters.siteId && assignment.siteId !== filters.siteId) return false;
        if (
          filters.dayOfWeek !== undefined &&
          assignment.dayOfWeek !== filters.dayOfWeek
        )
          return false;
        return true;
      })
      .map((assignment) => this.present(assignment));
  }

  create(dto: CreateAssignmentDto) {
    this.validateTimes(dto.startTime, dto.endTime);
    this.ensureAgent(dto.userId);
    this.ensureSite(dto.siteId);
    const assignment: AssignmentEntity = {
      id: `assign-${Date.now()}`,
      userId: dto.userId,
      siteId: dto.siteId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      createdAt: new Date(),
    };
    this.assignments.push(assignment);
    return this.present(assignment);
  }

  update(id: string, dto: UpdateAssignmentDto) {
    const assignment = this.ensureAssignment(id);
    if (dto.userId) {
      this.ensureAgent(dto.userId);
      assignment.userId = dto.userId;
    }
    if (dto.siteId) {
      this.ensureSite(dto.siteId);
      assignment.siteId = dto.siteId;
    }
    if (dto.dayOfWeek !== undefined) assignment.dayOfWeek = dto.dayOfWeek;
    if (dto.startTime || dto.endTime) {
      const start = dto.startTime ?? assignment.startTime;
      const end = dto.endTime ?? assignment.endTime;
      this.validateTimes(start, end);
      assignment.startTime = start;
      assignment.endTime = end;
    }
    return this.present(assignment);
  }

  remove(id: string) {
    const assignment = this.ensureAssignment(id);
    this.assignments = this.assignments.filter((item) => item.id !== id);
    return this.present(assignment);
  }
}
