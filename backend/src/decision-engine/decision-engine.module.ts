import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DecisionEngineService } from './decision-engine.service';
import { DecisionEngineController } from './decision-engine.controller';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { MapsModule } from '../maps/maps.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Parcel]),
    MapsModule,
    AuditModule,
  ],
  controllers: [DecisionEngineController],
  providers: [DecisionEngineService],
  exports: [DecisionEngineService],
})
export class DecisionEngineModule {}