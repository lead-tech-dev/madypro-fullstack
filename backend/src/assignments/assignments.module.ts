import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { UsersModule } from '../users/users.module';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [UsersModule, SitesModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
