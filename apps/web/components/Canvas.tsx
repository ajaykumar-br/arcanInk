import { useEffect, useRef, useState } from "react";
import { RightBar } from "./RightBar";
import { CreateShape } from "@/draw/CreateShape";
import ZoomBar from "./ZoomBar";
import { useTheme } from "./ThemeProvider";

export type Tool = "SELECT" | "RECT" | "LINE" | "CIRCLE" | "PENCIL" | "ARROW" | "ERASER" | "FREEHAND" | "TEXT";

export function Canvas({
  roomId,
  socket,
}: {
  roomId: string;
  socket: WebSocket;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingCanvas, setDrawingCanvas] = useState<CreateShape>();
  const [selectedTool, setSelectedTool] = useState<Tool>("SELECT");
  const [zoom, setZoom] = useState(1);
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
    draw.onViewChange = setZoom;
    setDrawingCanvas(draw);

    return () => {
      draw.destroy();
    };
  }, [canvasRef, roomId, socket]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="touch-none" />
      <ZoomBar
        zoom={zoom}
        onZoomIn={() => drawingCanvas?.zoomBy(1.2)}
        onZoomOut={() => drawingCanvas?.zoomBy(1 / 1.2)}
        onReset={() => drawingCanvas?.resetZoom()}
        onUndo={() => drawingCanvas?.undo()}
        onRedo={() => drawingCanvas?.redo()}
      />
      <RightBar selectedTool={selectedTool} setSelectedTool={setSelectedTool} />
    </div>
  );
}
