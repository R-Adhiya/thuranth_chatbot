import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  calculateTrustScore(
    totalDeliveries: number,
    successfulDeliveries: number,
    lateDeliveries: number,
    exceptionCount: number,
  ): number {
    if (totalDeliveries === 0) return 100; // New partners start with full trust

    const successRate = (successfulDeliveries / totalDeliveries) * 100;
    const lateRate = (lateDeliveries / totalDeliveries) * 100;
    const exceptionRate = (exceptionCount / totalDeliveries) * 100;

    // Weighted calculation
    let trustScore = successRate * 0.6; // 60% weight on success rate
    trustScore -= lateRate * 0.3; // 30% penalty for late deliveries
    trustScore -= exceptionRate * 0.4; // 40% penalty for exceptions

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, trustScore));
  }

  updateTrustScore(vehicleId: string, deliveryOutcome: 'success' | 'late' | 'exception') {
    this.logger.log(`Updating trust score for vehicle ${vehicleId}: ${deliveryOutcome}`);
    // In a real implementation, this would update the database
    return {
      vehicleId,
      outcome: deliveryOutcome,
      timestamp: new Date().toISOString(),
    };
  }

  getTrustScoreHistory(vehicleId: string) {
    this.logger.log(`Getting trust score history for vehicle ${vehicleId}`);
    // Mock data - replace with actual database query
    return {
      vehicleId,
      currentScore: 85.5,
      history: [
        { date: '2024-01-01', score: 100 },
        { date: '2024-01-15', score: 95 },
        { date: '2024-02-01', score: 90 },
        { date: '2024-02-15', score: 85.5 },
      ],
    };
  }
}