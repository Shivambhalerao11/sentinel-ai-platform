import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "../context/ToastContext";

export interface WebSocketEvent {
  event: "COMPLAINT_CREATED" | "COMPLAINT_UPDATED" | "EMERGENCY_SOS_TRIGGERED" | "PONG" | string;
  data?: any;
  message?: string;
  timestamp?: string;
}

export function useWebSocket(onEvent?: (event: WebSocketEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const toast = useToast();
  const reconnectTimerRef = useRef<any>(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/v1/ws`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Send heartbeat ping
        ws.send(JSON.stringify({ type: "PING", client: "Sentinel Web" }));
      };

      ws.onmessage = (evt) => {
        try {
          const payload: WebSocketEvent = JSON.parse(evt.data);

          if (payload.event === "EMERGENCY_SOS_TRIGGERED") {
            toast.error(payload.message || "CRITICAL EMERGENCY SOS ALERT BROADCASTED!", "EMERGENCY SOS");
          } else if (payload.event === "COMPLAINT_CREATED") {
            toast.info(payload.message || "New complaint logged in system", "NEW INCIDENT");
          } else if (payload.event === "COMPLAINT_UPDATED") {
            toast.success(payload.message || "Complaint status updated", "STATUS CHANGE");
          }

          if (onEvent) {
            onEvent(payload);
          }
        } catch {
          // Ignore unparseable raw string pings
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 5 seconds
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
    } catch (err) {
      setIsConnected(false);
    }
  }, [onEvent, toast]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  const sendEvent = useCallback((event: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
    }
  }, []);

  return { isConnected, sendEvent };
}
