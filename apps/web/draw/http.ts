import { HTTP_BACKEND_URL } from "@/config";
import axios from "axios";
import { Shape } from "./CreateShape";

export async function getExistingShapes(roomId: string) {
  const url = `${HTTP_BACKEND_URL}/getDrawings/${roomId}`;
  console.log("line 7", url);
  const res = await axios.get(url);
  const messages = res;

  return messages;
}
