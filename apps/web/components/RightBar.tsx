import { MousePointer2Icon, TypeIcon, Circle, EraserIcon, Minus, MoveUpRight, PencilIcon, PenToolIcon, RectangleHorizontalIcon } from "lucide-react";
import { IconsButton } from "./IconsButton";
import { Tool } from "./Canvas";

export function RightBar({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: string;
  setSelectedTool: (s: Tool) => void;
}) {
  return (
    <div className="fixed bottom-24 right-10 rounded-md bg-card border border-border py-2">
      <div className="flex flex-col">
        <IconsButton
          icon={<MousePointer2Icon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("SELECT");
          }}
          activated={selectedTool === "SELECT"}
        />
        <IconsButton
          icon={<RectangleHorizontalIcon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("RECT");
          }}
          activated={selectedTool === "RECT"}
        />
        <IconsButton
          icon={<Circle className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("CIRCLE");
          }}
          activated={selectedTool === "CIRCLE"}
        />
        <IconsButton
          icon={<Minus className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("LINE");
          }}
          activated={selectedTool === "LINE"}
        />
        <IconsButton
          icon={<MoveUpRight className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("ARROW");
          }}
          activated={selectedTool === "ARROW"}
        />
        <IconsButton
          icon={<PencilIcon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("PENCIL");
          }}
          activated={selectedTool === "PENCIL"}
        />
        <IconsButton
          icon={<PenToolIcon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("FREEHAND");
          }}
          activated={selectedTool === "FREEHAND"}
        />
        <IconsButton
          icon={<TypeIcon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("TEXT");
          }}
          activated={selectedTool === "TEXT"}
        />
        <IconsButton
          icon={<EraserIcon className="w-4 h-4 cursor-pointer" />}
          onClick={() => {
            setSelectedTool("ERASER");
          }}
          activated={selectedTool === "ERASER"}
        />
      </div>
    </div>
  );
}
