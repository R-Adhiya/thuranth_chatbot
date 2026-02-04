import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum AuditAction {
  PARCEL_CREATED = 'parcel_created',
  PARCEL_DISPATCHED = 'parcel_dispatched',
  CONSOLIDATION_EVALUATED = 'consolidation_evaluated',
  CONSOLIDATION_APPROVED = 'consolidation_approved',
  CONSOLIDATION_REJECTED = 'consolidation_rejected',
  CUSTODY_TRANSFERRED = 'custody_transferred',
  PARCEL_DELIVERED = 'parcel_delivered',
  EXCEPTION_RECORDED = 'exception_recorded',
}

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({
    type: 'text',
  })
  action: AuditAction;

  @Column()
  actorId: string;

  @Column()
  actorType: string; // 'dispatcher', 'driver', 'system'

  @Column({ nullable: true })
  parcelId: string;

  @Column('text', { nullable: true })
  metadata: string; // JSON string

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}