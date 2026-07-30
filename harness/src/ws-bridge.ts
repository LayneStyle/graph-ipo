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
    try {
      this.wss = new WebSocketServer({ port });

      this.wss.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[GraphIPO] WebSocket port ${port} is already in use. Canvas UI sync will be unavailable. Kill the other process or use a different port.`);
          this.wss = null;
        } else {
          console.error('[GraphIPO] WebSocket error:', err);
        }
      });

      console.error(`[GraphIPO] WebSocket Bridge initialized on port ${port}`);

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);
        console.error('[GraphIPO] Canvas UI connected');

        if (this.getStateFn) {
          ws.send(JSON.stringify({ type: 'FULL_STATE', payload: this.getStateFn() }));
        }

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString()) as WSMessage;
            if (this.onMutationFn) {
              this.onMutationFn(msg);
            }
            this.broadcastExcept(ws, msg);
          } catch (err) {
            console.error('[GraphIPO] Invalid WS message from UI:', err);
          }
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          console.error('[GraphIPO] Canvas UI disconnected');
        });
      });
    } catch (err) {
      console.error('[GraphIPO] Failed to initialize WebSocket Bridge:', err);
      this.wss = null;
    }
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
