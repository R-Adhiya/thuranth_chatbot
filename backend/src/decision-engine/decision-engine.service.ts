import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus, VehicleType } from '../vehicles/entities/vehicle.entity';
import { Parcel, ParcelPriority } from '../parcels/entities/parcel.entity';
import { MapsService } from '../maps/maps.service';
import { AuditService } from '../audit/audit.service';

export interface ConsolidationDecision {
  decision: 'ACCEPT' | 'REJECT';
  vehicleId?: string;
  score?: number;
  explanation: string;
  constraints: {
    capacity: boolean;
    sla: boolean;
    deviation: boolean;
    trust: boolean;
  };
  impact?: {
    additionalKm: number;
    additionalMinutes: number;
    utilizationImprovement: number;
  };
}

export interface DecisionContext {
  parcel: Parcel;
  availableVehicles: Vehicle[];
  shadowMode: boolean;
}

@Injectable()
export class DecisionEngineService {
  private readonly logger = new Logger(DecisionEngineService.name);

  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private mapsService: MapsService,
    private auditService: AuditService,
  ) {}

  async evaluateConsolidation(context: DecisionContext): Promise<ConsolidationDecision> {
    const { parcel, availableVehicles, shadowMode } = context;
    
    this.logger.log(`Evaluating consolidation for parcel ${parcel.trackingNumber}`);

    // Filter eligible vehicles based on hard constraints
    const eligibleVehicles = await this.filterEligibleVehicles(parcel, availableVehicles);

    if (eligibleVehicles.length === 0) {
      const decision: ConsolidationDecision = {
        decision: 'REJECT',
        explanation: 'No vehicles meet hard constraints (capacity, location, or trust)',
        constraints: {
          capacity: false,
          sla: false,
          deviation: false,
          trust: false,
        },
      };

      await this.auditService.logDecision(parcel.id, decision, shadowMode);
      return decision;
    }

    // Score and rank eligible vehicles
    const scoredVehicles = await this.scoreVehicles(parcel, eligibleVehicles);
    const bestVehicle = scoredVehicles[0];

    // Apply final decision logic
    const decision = await this.makeDecision(parcel, bestVehicle, shadowMode);
    
    await this.auditService.logDecision(parcel.id, decision, shadowMode);
    return decision;
  }

  private async filterEligibleVehicles(parcel: Parcel, vehicles: Vehicle[]): Promise<Vehicle[]> {
    const eligible: Vehicle[] = [];

    for (const vehicle of vehicles) {
      // Hard constraint 1: Capacity
      if (!this.checkCapacityConstraint(parcel, vehicle)) {
        continue;
      }

      // Hard constraint 2: Trust score
      if (!this.checkTrustConstraint(vehicle)) {
        continue;
      }

      // Hard constraint 3: Vehicle status
      if (vehicle.status !== VehicleStatus.DISPATCHED && vehicle.status !== VehicleStatus.IN_TRANSIT) {
        continue;
      }

      // Hard constraint 4: Consolidation allowed
      if (!vehicle.allowConsolidation) {
        continue;
      }

      eligible.push(vehicle);
    }

    return eligible;
  }

  private checkCapacityConstraint(parcel: Parcel, vehicle: Vehicle): boolean {
    return (
      vehicle.spareWeight >= parcel.weight &&
      vehicle.spareVolume >= parcel.volume
    );
  }

  private checkTrustConstraint(vehicle: Vehicle): boolean {
    // Minimum trust score threshold based on vehicle type
    const minTrustScore = vehicle.type === VehicleType.TWO_WHEELER ? 80 : 70;
    return vehicle.trustScore >= minTrustScore;
  }

  private async scoreVehicles(parcel: Parcel, vehicles: Vehicle[]): Promise<Array<{ vehicle: Vehicle; score: number; impact: any }>> {
    const scored = [];

    for (const vehicle of vehicles) {
      const score = await this.calculateVehicleScore(parcel, vehicle);
      const impact = await this.calculateImpact(parcel, vehicle);
      
      scored.push({ vehicle, score, impact });
    }

    // Sort by score (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  private async calculateVehicleScore(parcel: Parcel, vehicle: Vehicle): Promise<number> {
    let score = 0;

    // Factor 1: Spare capacity utilization (0-30 points)
    const capacityUtilization = Math.min(
      (parcel.weight / vehicle.spareWeight) * 100,
      (parcel.volume / vehicle.spareVolume) * 100
    );
    score += (capacityUtilization / 100) * 30;

    // Factor 2: Proximity to destination (0-25 points)
    const distance = await this.mapsService.calculateDistance(
      { lat: vehicle.currentLat, lng: vehicle.currentLng },
      { lat: parcel.destinationLat, lng: parcel.destinationLng }
    );
    const proximityScore = Math.max(0, 25 - (distance.distanceKm / 10) * 5);
    score += proximityScore;

    // Factor 3: Trust score (0-20 points)
    score += (vehicle.trustScore / 100) * 20;

    // Factor 4: Vehicle type preference (0-15 points)
    if (vehicle.type === VehicleType.FOUR_WHEELER) {
      score += 15; // Prefer 4-wheelers for consolidation
    } else {
      score += 5; // 2-wheelers get lower preference
    }

    // Factor 5: Parcel priority bonus (0-10 points)
    const priorityBonus = {
      [ParcelPriority.LOW]: 2,
      [ParcelPriority.NORMAL]: 5,
      [ParcelPriority.HIGH]: 8,
      [ParcelPriority.URGENT]: 10,
    };
    score += priorityBonus[parcel.priority];

    return Math.round(score);
  }

  private async calculateImpact(parcel: Parcel, vehicle: Vehicle) {
    // Calculate additional distance and time
    const toDestination = await this.mapsService.calculateDistance(
      { lat: vehicle.currentLat, lng: vehicle.currentLng },
      { lat: parcel.destinationLat, lng: parcel.destinationLng }
    );

    // Estimate utilization improvement
    const currentUtilization = vehicle.utilizationPercentage;
    const newWeight = vehicle.currentWeight + parcel.weight;
    const newVolume = vehicle.currentVolume + parcel.volume;
    const newUtilization = Math.max(
      (newWeight / vehicle.maxWeight) * 100,
      (newVolume / vehicle.maxVolume) * 100
    );

    return {
      additionalKm: toDestination.distanceKm,
      additionalMinutes: toDestination.durationMinutes,
      utilizationImprovement: newUtilization - currentUtilization,
    };
  }

  private async makeDecision(
    parcel: Parcel, 
    bestCandidate: { vehicle: Vehicle; score: number; impact: any }, 
    shadowMode: boolean
  ): Promise<ConsolidationDecision> {
    
    const { vehicle, score, impact } = bestCandidate;

    // Final constraint checks with detailed evaluation
    const constraints = {
      capacity: this.checkCapacityConstraint(parcel, vehicle),
      sla: await this.checkSlaConstraint(parcel, vehicle, impact),
      deviation: this.checkDeviationConstraint(vehicle, impact),
      trust: this.checkTrustConstraint(vehicle),
    };

    // All constraints must pass
    const allConstraintsMet = Object.values(constraints).every(Boolean);

    // Minimum score threshold
    const minScore = vehicle.type === VehicleType.TWO_WHEELER ? 60 : 50;
    const scoreThresholdMet = score >= minScore;

    if (allConstraintsMet && scoreThresholdMet) {
      return {
        decision: 'ACCEPT',
        vehicleId: vehicle.id,
        score,
        explanation: `Vehicle ${vehicle.registrationNumber} selected with score ${score}. Impact: +${impact.additionalKm}km, +${impact.additionalMinutes}min, +${impact.utilizationImprovement.toFixed(1)}% utilization.`,
        constraints,
        impact,
      };
    } else {
      const reasons = [];
      if (!allConstraintsMet) {
        const failedConstraints = Object.entries(constraints)
          .filter(([_, passed]) => !passed)
          .map(([constraint]) => constraint);
        reasons.push(`Failed constraints: ${failedConstraints.join(', ')}`);
      }
      if (!scoreThresholdMet) {
        reasons.push(`Score ${score} below threshold ${minScore}`);
      }

      return {
        decision: 'REJECT',
        explanation: `Best candidate ${vehicle.registrationNumber} rejected. ${reasons.join('. ')}`,
        constraints,
      };
    }
  }

  private async checkSlaConstraint(parcel: Parcel, vehicle: Vehicle, impact: any): Promise<boolean> {
    // Calculate if adding this delivery would violate SLA
    const now = new Date();
    const timeToDestination = impact.additionalMinutes;
    const estimatedDeliveryTime = new Date(now.getTime() + timeToDestination * 60000);
    
    // Add buffer based on vehicle type
    const slaBuffer = vehicle.type === VehicleType.TWO_WHEELER ? 15 : 30; // minutes
    const slaDeadlineWithBuffer = new Date(parcel.slaDeadline.getTime() - slaBuffer * 60000);
    
    return estimatedDeliveryTime <= slaDeadlineWithBuffer;
  }

  private checkDeviationConstraint(vehicle: Vehicle, impact: any): boolean {
    return (
      impact.additionalKm <= vehicle.maxDeviationKm &&
      impact.additionalMinutes <= vehicle.maxDeviationMinutes
    );
  }
}