import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { DecisionEngineService } from './decision-engine.service';

@Controller('decision-engine')
export class DecisionEngineController {
  constructor(private readonly decisionEngineService: DecisionEngineService) {}

  @Post('evaluate')
  async evaluateConsolidation(@Body() evaluationDto: any) {
    // Mock evaluation for demo
    return {
      decision: 'ACCEPT',
      vehicleId: 'vehicle-123',
      score: 85,
      explanation: 'Vehicle VH-001 selected with score 85. Impact: +2.5km, +8min, +15.2% utilization.',
      constraints: {
        capacity: true,
        sla: true,
        deviation: true,
        trust: true,
      },
      impact: {
        additionalKm: 2.5,
        additionalMinutes: 8,
        utilizationImprovement: 15.2,
      },
    };
  }

  @Get('stats')
  getDecisionStats() {
    return {
      totalEvaluations: 156,
      acceptedDecisions: 89,
      rejectedDecisions: 67,
      averageScore: 72.5,
      dispatchesAvoided: 89,
    };
  }
}