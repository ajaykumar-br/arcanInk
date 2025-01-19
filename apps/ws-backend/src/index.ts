import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prisma } from "@repo/db/prisma";

const wss = new WebSocketServer({port: 8080});

interface User {
    ws: WebSocket,
    rooms: string[],
    userId: string
}

const users: User[] = [];

function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        if(typeof decoded == "string") {
            return null;
        }
        if(!decoded || !decoded.userId) {
            return null;
        }
        return decoded.userId;
    } catch (e) {
        return null;
    }
}

wss.on("connection", (ws, request) => {
    const url = request.url;
    if(!url) {
        return;
    }
    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";
    const userId = checkUser(token);

    if(userId == null) {
        ws.close();
        return null;
    }

    users.push({
        ws,
        rooms:[],
        userId
    })

    ws.on("message", async (data) => {
        const parsedData = JSON.parse(data.toString());
        if(parsedData.type === "join_room") {
            const user = users.find((user) => {user.ws === ws});
            user?.rooms.push(parsedData.roomId);
        }
        if(parsedData.type === "leave_room") {
            // find if the filter is present
            const user = users.find(x => x.ws === ws);
            if(!user) {
                return;
            }
            // find the user and remove roomId from his rooms array
            user.rooms = user.rooms.filter(x => x === parsedData.room);
        }
        if(parsedData.type === "chat") {
            const roomId = parsedData.roomId;
            const shape = parsedData.shape;
            const shapeParams = parsedData.shapeParams;
            // find user's room
            const user = users.find(x => x.userId === userId);
            if(!user) {
                return null;
            }
            // get roomId, userId, store the chat in db
            await prisma.canvas.create({
              data: {
                shape,
                shapeParams,
                userId: user.toString(),
                roomId: Number(roomId),
              },
            });
            // broadcast the message
            users.map((user) => {
                if(user.rooms.includes(roomId)){
                    user.ws.send(JSON.stringify({
                        type: "chat",
                        shape,
                        shapeParams,
                        userId: user,
                        roomId
                    }));
                }
            });
        }
    });
})