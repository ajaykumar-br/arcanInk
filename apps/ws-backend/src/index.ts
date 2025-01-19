import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

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

    ws.on("message", (data) => {
        const parsedData = JSON.parse(data.toString());
        if(parsedData.type === "join_room") {
            // do something
        }
        if(parsedData.type === "chat") {
            // do something
        }
        if(parsedData.type === "leave_room") {
            // do something
        }
    });
})