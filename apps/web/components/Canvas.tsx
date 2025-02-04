import { useEffect, useRef, useState } from "react";
import { RightBar } from "./RightBar";
import { CreateShape } from "@/draw/CreateShape";

export type Tool = "rect" | "line" | "circle";

export function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingCanvas, setDrawingCanvas] = useState<CreateShape>();
  const [selectedTool, setSelectedTool] = useState<Tool>("rect");

  useEffect(() => {
    drawingCanvas?.setTool(selectedTool);
  }, [drawingCanvas, selectedTool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = new CreateShape(canvas, socket, roomId);
    setDrawingCanvas(draw);

    return () => {
      draw.destroy();
    };
  }, [canvasRef]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} />
      <RightBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
    </div>
  );
}
