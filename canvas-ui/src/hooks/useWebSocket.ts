import { useState, useEffect, useCallback, useRef } from 'react';
import { WSMessage, WSMessageType } from '../types/websocket';

type MessageCallbacks = {
  [K in WSMessageType]?: (payload: any) => void;
};

export function useWebSocket(callbacks: MessageCallbacks) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:9120');
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          const callback = callbacksRef.current[message.type];
          if (callback) {
            callback(message.payload);
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMutation = useCallback((msg: { type: string, payload: any }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('Cannot send mutation, WebSocket is not open');
    }
  }, []);

  return { connected, sendMutation };
}
