import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './config/app.config';
import { DbConfig } from './config/db.config';
import { AuthConfig } from './config/auth.config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { SitesModule } from './sites/sites.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AbsencesModule } from './absences/absences.module';
import { ReportsModule } from './reports/reports.module';
import { DevicesModule } from './devices/devices.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { InterventionsModule } from './interventions/interventions.module';
import { PrismaModule } from './database/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AnomaliesModule } from './anomalies/anomalies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, DbConfig, AuthConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    SitesModule,
    AssignmentsModule,
    AttendanceModule,
    AbsencesModule,
    ReportsModule,
    DevicesModule,
    SettingsModule,
    NotificationsModule,
    AuditModule,
    InterventionsModule,
    RealtimeModule,
    AnomaliesModule,
  ],
})
export class AppModule {}
