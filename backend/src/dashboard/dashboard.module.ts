import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { HubsController } from './hubs.controller';

@Module({
  controllers: [DashboardController, HubsController],
})
export class DashboardModule {}