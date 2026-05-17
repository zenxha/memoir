import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'ws';

@WebSocketGateway({ path: '/ws' })
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;

  afterInit(server: Server) {
    this.server = server;
  }

  broadcast(type: string, payload: unknown) {
    const msg = JSON.stringify({ type, payload });
    this.server?.clients?.forEach((client) => {
      if (client.readyState === 1) client.send(msg);
    });
  }
}
