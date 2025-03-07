import { RoomCanvas } from "@/components/RoomCanvas";

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ room_id: string }>;
}) {
  const room = await params;

  return <RoomCanvas roomId={room.room_id} />;
}
