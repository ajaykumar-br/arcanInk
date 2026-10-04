import { useEffect, useRef, useState } from "react";
import { RightBar } from "./RightBar";
import { CreateShape } from "@/draw/CreateShape";
import ZoomBar from "./ZoomBar";
import { useTheme } from "./ThemeProvider";

export type Tool = "" | "RECT" | "LINE" | "CIRCLE" | "PENCIL" | "ARROW" | "ERASER" | "FREEHAND"; 

export function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingCanvas, setDrawingCanvas] = useState<CreateShape>();
  const [selectedTool, setSelectedTool] = useState<Tool>("RECT");
  const { theme } = useTheme();

  useEffect(() => {
    drawingCanvas?.setTool(selectedTool);
  }, [drawingCanvas, selectedTool]);

  useEffect(() => {
    drawingCanvas?.setTheme(theme);
  }, [drawingCanvas, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = new CreateShape(canvas, socket, roomId); // create a new instance of CreateShape class
    setDrawingCanvas(draw);

    return () => {
      draw.destroy();
    };
  }, [canvasRef, roomId, socket]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="touch-none" />
      <ZoomBar />
      <RightBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
    </div>
  );
}
