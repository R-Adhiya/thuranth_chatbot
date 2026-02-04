import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum VehicleType {
  TWO_WHEELER = '2w',
  FOUR_WHEELER = '4w',
}

export enum VehicleStatus {
  IDLE = 'idle',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  RETURNING = 'returning',
  MAINTENANCE = 'maintenance',
}

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Column({ unique: true })
  registrationNumber: string;

  @Column({
    type: 'text',
  })
  type: VehicleType;

  @Column({
    type: 'text',
    default: VehicleStatus.IDLE,
  })
  status: VehicleStatus;

  @Column()
  driverName: string;

  @Column()
  driverPhone: string;

  @Column({ nullable: true })
  driverLicense: string;

  @Column()
  carrierName: string;

  // Capacity constraints
  @Column('decimal', { precision: 5, scale: 2 })
  maxWeight: number; // in kg

  @Column('decimal', { precision: 5, scale: 2 })
  maxVolume: number; // in cubic meters

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  currentWeight: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  currentVolume: number;

  // Current location
  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  currentLat: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  currentLng: number;

  @Column({ nullable: true })
  lastLocationUpdate: Date;

  // Route information
  @Column('text', { nullable: true })
  plannedRoute: string; // JSON string of route waypoints

  @Column({ nullable: true })
  estimatedReturnTime: Date;

  // Consolidation constraints
  @Column('decimal', { precision: 5, scale: 2, default: 5 })
  maxDeviationKm: number;

  @Column({ default: 30 })
  maxDeviationMinutes: number;

  @Column({ default: true })
  allowConsolidation: boolean;

  // Trust and performance
  @Column('decimal', { precision: 3, scale: 2, default: 100 })
  trustScore: number; // 0-100

  @Column({ default: 0 })
  totalDeliveries: number;

  @Column({ default: 0 })
  successfulDeliveries: number;

  @Column({ default: 0 })
  lateDeliveries: number;

  // Computed properties
  get spareWeight(): number {
    return this.maxWeight - this.currentWeight;
  }

  get spareVolume(): number {
    return this.maxVolume - this.currentVolume;
  }

  get utilizationPercentage(): number {
    const weightUtil = (this.currentWeight / this.maxWeight) * 100;
    const volumeUtil = (this.currentVolume / this.maxVolume) * 100;
    return Math.max(weightUtil, volumeUtil);
  }

  get deliverySuccessRate(): number {
    if (this.totalDeliveries === 0) return 100;
    return (this.successfulDeliveries / this.totalDeliveries) * 100;
  }
}