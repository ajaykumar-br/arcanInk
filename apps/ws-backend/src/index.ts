import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@ajaykumar_br/backend-common/config";
import { prisma } from "@ajaykumar_br/db/prisma";

const PORT = Number(process.env.WS_PORT) || 8080;
const MAX_PAYLOAD_BYTES = 1024 * 1024; // a long freehand stroke is well under this
const HEARTBEAT_MS = 30_000;

const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_PAYLOAD_BYTES });

const SHAPES = new Set(["LINE", "RECT", "CIRCLE", "PENCIL", "TEXT", "ARROW", "FREEHAND"]);

interface User {
  ws: WebSocket;
  rooms: Set<string>;
  userId: string;
  isAlive: boolean;
}

const users = new Set<User>();

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (typeof decoded == "string") {
      return null;
    }
    if (!decoded || !decoded.userId) {
      return null;
    }
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(roomId: string, payload: unknown) {
  for (const user of users) {
    if (user.rooms.has(roomId)) {
      send(user.ws, payload);
    }
  }
}

function toRoomNumber(roomId: unknown): number | null {
  const n = Number(roomId);
  return Number.isInteger(n) ? n : null;
}

wss.on("connection", (ws, request) => {
  const url = request.url;
  if (!url) {
    ws.close();
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return;
  }

  const user: User = { userId, rooms: new Set(), ws, isAlive: true };
  users.add(user);

  ws.on("pong", () => {
    user.isAlive = true;
  });
  ws.on("close", () => {
    users.delete(user);
  });
  ws.on("error", () => {
    users.delete(user);
  });

  ws.on("message", async (data) => {
    try {
      let parsedData: any;
      try {
        parsedData = JSON.parse(data.toString());
      } catch {
        return send(ws, { type: "error", message: "Invalid JSON" });
      }
      if (!parsedData || typeof parsedData !== "object") return;

      const roomId = String(parsedData.roomId);
      const roomNumber = toRoomNumber(parsedData.roomId);

      if (parsedData.type === "join_room") {
        if (roomNumber === null) {
          return send(ws, { type: "error", message: "Invalid room" });
        }
        const room = await prisma.room.findUnique({ where: { id: roomNumber } });
        if (!room) {
          return send(ws, { type: "error", message: "Room not found" });
        }
        user.rooms.add(roomId);
        return;
      }

      if (parsedData.type === "leave_room") {
        user.rooms.delete(roomId);
        return;
      }

      // everything below acts on a room, so the sender must have joined it
      if (!user.rooms.has(roomId) || roomNumber === null) {
        return send(ws, { type: "error", message: "Join the room first" });
      }

      if (parsedData.type === "chat") {
        const shape = String(parsedData.shape).toUpperCase();
        const shapeParams = parsedData.shapeParams;
        if (!SHAPES.has(shape) || typeof shapeParams !== "string") {
          return send(ws, { type: "error", message: "Invalid shape" });
        }
        try {
          JSON.parse(shapeParams);
        } catch {
          return send(ws, { type: "error", message: "Invalid shape params" });
        }

        const saved = await prisma.canvas.create({
          data: {
            shape: shape as any,
            shapeParams,
            userId: user.userId,
            roomId: roomNumber,
          },
        });

        // Sent to everyone in the room, sender included: the echo carries the DB id
        // (needed to erase the shape) and the sender's clientId to match its local copy.
        broadcast(roomId, {
          type: "chat",
          id: saved.id,
          shape,
          shapeParams,
          userId: user.userId,
          roomId,
          clientId: parsedData.clientId,
        });
        return;
      }

      if (parsedData.type === "erase") {
        if (!Array.isArray(parsedData.shapeIds)) return;
        const requested = parsedData.shapeIds
          .map(Number)
          .filter((id: number) => Number.isInteger(id));

        // only shapes that really belong to this room are deleted and announced
        const owned = await prisma.canvas.findMany({
          where: { id: { in: requested }, roomId: roomNumber },
          select: { id: true },
        });
        const shapeIds = owned.map((s) => s.id);
        if (!shapeIds.length) return;

        await prisma.canvas.deleteMany({
          where: { id: { in: shapeIds }, roomId: roomNumber },
        });

        broadcast(roomId, { type: "erase", shapeIds, roomId });
      }
    } catch (e) {
      console.error("ws message handler failed", e);
      send(ws, { type: "error", message: "Server error" });
    }
  });
});

// drop connections that stopped answering pings (closed laptops, dead networks)
const heartbeat = setInterval(() => {
  for (const user of users) {
    if (!user.isAlive) {
      user.ws.terminate();
      users.delete(user);
      continue;
    }
    user.isAlive = false;
    user.ws.ping();
  }
}, HEARTBEAT_MS);

wss.on("close", () => clearInterval(heartbeat));
