import { Module } from '@nestjs/common';
import { TeamFeedController } from './team-feed.controller';
import { TeamFeedService } from './team-feed.service';

@Module({
  controllers: [TeamFeedController],
  providers: [TeamFeedService],
})
export class TeamFeedModule {}
