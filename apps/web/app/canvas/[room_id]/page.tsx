import { RoomCanvas } from "@/components/RoomCanvas";

export default async function CanvasPage({
  params,
}: {
  params: {
    room_id: string;
  };
}) {
  const roomId = (await params).room_id;

  return <RoomCanvas roomId={roomId} />;
}
