import { Module } from '@nestjs/common';
import { TeamFeedController } from './team-feed.controller';
import { TeamFeedService } from './team-feed.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TeamFeedController],
  providers: [TeamFeedService],
})
export class TeamFeedModule {}
