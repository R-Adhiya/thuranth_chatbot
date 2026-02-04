import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ParcelsModule } from './parcels/parcels.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DecisionEngineModule } from './decision-engine/decision-engine.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { WebsocketModule } from './websocket/websocket.module';
import { MapsModule } from './maps/maps.module';
import { TrustScoreModule } from './trust-score/trust-score.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    ParcelsModule,
    VehiclesModule,
    DecisionEngineModule,
    BlockchainModule,
    WebsocketModule,
    MapsModule,
    TrustScoreModule,
    AuditModule,
    DashboardModule,
  ],
})
export class AppModule {}