import { WebSocketServer, WebSocket } from 'ws';
import { IPOCanvas, IPONode } from './types.js';

export interface WSMessage {
  type: string;
  payload: any;
}

class WSBridge {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private getStateFn: (() => IPOCanvas) | null = null;
  private onMutationFn: ((msg: WSMessage) => void) | null = null;

  public setGetState(fn: () => IPOCanvas) { this.getStateFn = fn; }
  public setOnMutation(fn: (msg: WSMessage) => void) { this.onMutationFn = fn; }

  public initialize(port: number = 9120) {
    this.wss = new WebSocketServer({ port });
    console.error(`WebSocket Bridge initialized on port ${port}`);

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.error('Canvas UI connected');

      // Send full state on connect
      if (this.getStateFn) {
        ws.send(JSON.stringify({ type: 'FULL_STATE', payload: this.getStateFn() }));
      }

      // Handle messages FROM the UI (bidirectional)
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as WSMessage;
          if (this.onMutationFn) {
            this.onMutationFn(msg);
          }
          // Broadcast the change to all OTHER clients
          this.broadcastExcept(ws, msg);
        } catch (err) {
          console.error('Invalid WS message from UI:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.error('Canvas UI disconnected');
      });
    });
  }

  public broadcast(message: WSMessage) {
    if (!this.wss) return;
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private broadcastExcept(sender: WebSocket, message: WSMessage) {
    if (!this.wss) return;
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}

export const wsBridge = new WSBridge();
