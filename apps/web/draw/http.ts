import { HTTP_BACKEND_URL } from "@/config";
import axios from "axios";
import { Shape } from "./CreateShape";

export async function getExistingShapes(roomId: string) {
  const res = await axios.get(`${HTTP_BACKEND_URL}/getDrawings/${roomId}`);
  const messages: Shape[] = res.data.messages;

  return messages.map((message) => ({
    shape: message.shape,
    // Parse if stored as JSON string
    shapeParams:
      typeof message.shapeParams === "string"
        ? JSON.parse(message.shapeParams)
        : message.shapeParams,
  }));
}
