import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ParcelStatus {
  CREATED = 'created',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
}

export enum ParcelPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('parcels')
export class Parcel extends BaseEntity {
  @Column({ unique: true })
  trackingNumber: string;

  @Column()
  originAddress: string;

  @Column()
  destinationAddress: string;

  @Column('decimal', { precision: 10, scale: 6 })
  destinationLat: number;

  @Column('decimal', { precision: 10, scale: 6 })
  destinationLng: number;

  @Column('decimal', { precision: 5, scale: 2 })
  weight: number; // in kg

  @Column('decimal', { precision: 5, scale: 2 })
  volume: number; // in cubic meters

  @Column({
    type: 'text',
    default: ParcelStatus.CREATED,
  })
  status: ParcelStatus;

  @Column({
    type: 'text',
    default: ParcelPriority.NORMAL,
  })
  priority: ParcelPriority;

  @Column()
  slaDeadline: Date;

  @Column()
  carrierName: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  specialInstructions: string;

  // Original vehicle assignment
  @Column({ nullable: true })
  originalVehicleId: string;

  // Current executing vehicle (may be different due to consolidation)
  @Column({ nullable: true })
  executingVehicleId: string;

  // Blockchain tracking
  @Column({ nullable: true })
  blockchainTxHash: string;

  @Column({ default: false })
  isConsolidated: boolean;

  @Column({ nullable: true })
  consolidationReason: string;

  // Delivery confirmation
  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  proofOfDeliveryUrl: string;

  @Column({ nullable: true })
  deliveryNotes: string;
}