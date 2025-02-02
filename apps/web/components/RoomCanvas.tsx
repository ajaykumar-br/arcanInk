"use client";

import { useSocket } from "@/hooks/useSocket";

export function RoomCanvas({roomId}: {roomId: string}) {
    const { socket } = useSocket(roomId);

    if(!socket) {
        return <div>Loading Canvas...</div>
    }

    return <div className="flex items-center justify-center h-screen">
        room {`${roomId}`}
    </div>
}