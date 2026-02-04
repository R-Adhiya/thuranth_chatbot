import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebsocketGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  // Emit events to all connected clients
  emitParcelArrived(parcel: any) {
    this.server.emit('parcel:arrived', parcel);
  }

  emitConsolidationOpportunity(data: any) {
    this.server.emit('consolidation:opportunity', data);
  }

  emitVehicleUpdate(vehicle: any) {
    this.server.emit('vehicle:updated', vehicle);
  }

  emitDecisionMade(decision: any) {
    this.server.emit('decision:made', decision);
  }
}