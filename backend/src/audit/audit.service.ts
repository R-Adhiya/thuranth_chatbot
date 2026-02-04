import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async logDecision(parcelId: string, decision: any, shadowMode: boolean) {
    const auditLog = this.auditLogRepository.create({
      action: AuditAction.CONSOLIDATION_EVALUATED,
      actorId: 'system',
      actorType: 'system',
      parcelId,
      metadata: JSON.stringify({
        decision,
        shadowMode,
        timestamp: new Date().toISOString(),
      }),
      description: `Consolidation decision: ${decision.decision} - ${decision.explanation}`,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async logAction(
    action: AuditAction,
    actorId: string,
    actorType: string,
    parcelId?: string,
    metadata?: any,
    description?: string,
  ) {
    const auditLog = this.auditLogRepository.create({
      action,
      actorId,
      actorType,
      parcelId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      description,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async getAuditLogs(parcelId?: string, limit = 100) {
    const query = this.auditLogRepository.createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC')
      .limit(limit);

    if (parcelId) {
      query.where('audit.parcelId = :parcelId', { parcelId });
    }

    return query.getMany();
  }
}