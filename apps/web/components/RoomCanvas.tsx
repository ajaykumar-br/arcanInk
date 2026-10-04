"use client";

import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import { WS_URL } from "@/config";

const MAX_RECONNECT_DELAY_MS = 10_000;

export function RoomCanvas({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}?token=${token}`);
      const current = ws;
      current.onopen = () => {
        attempt = 0;
        current.send(JSON.stringify({ type: "join_room", roomId }));
        setSocket(current);
      };
      // Drop the socket and retry with backoff; Canvas reloads the room's shapes on the new socket.
      current.onclose = () => {
        if (disposed) return;
        setSocket(null);
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, MAX_RECONNECT_DELAY_MS));
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [roomId]);

  if (!socket) return <div>Connecting to server ...</div>;

  return (
    <div>
      <Canvas roomId={roomId} socket={socket} />
    </div>
  );
}
