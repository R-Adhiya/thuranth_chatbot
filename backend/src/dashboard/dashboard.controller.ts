import { Controller, Get } from '@nestjs/common';

@Controller('dashboard')
export class DashboardController {
  @Get('stats')
  getDashboardStats() {
    return {
      activeVehicles: 24,
      pendingParcels: 156,
      consolidationOpportunities: 12,
      todayDeliveries: 89,
      avgUtilization: 67.5,
      dispatchesAvoided: 15,
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        blockchain: 'connected',
        maps: 'connected',
      },
    };
  }
}