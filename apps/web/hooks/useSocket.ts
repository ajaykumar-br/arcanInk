import { WS_URL } from "@/config";
import { useEffect, useState } from "react";

export function useSocket(roomId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      console.log("socket opened...");
      ws.send(
        JSON.stringify({
          type: "join_room",
          roomId: roomId,
        })
      );
    };
    ws.onclose = () => console.log("socket closed");
    ws.onerror = (error) => console.error("Socket error:", error);

    setSocket(ws);

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [roomId, token]);

  return { socket };
}
