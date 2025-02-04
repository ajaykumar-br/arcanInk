import { Circle, PenLineIcon, RectangleHorizontalIcon } from "lucide-react";
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
    <div className="fixed bottom-60 right-10 rounded-md bg-gray-900 py-10">
      <div className="flex flex-col">
        <IconsButton
          icon={<RectangleHorizontalIcon />}
          onClick={() => {
            setSelectedTool("rect");
          }}
          activated={selectedTool == "rect"}
        />
        <IconsButton
          icon={<Circle />}
          onClick={() => {
            setSelectedTool("circle");
          }}
          activated={selectedTool == "circle"}
        />
        <IconsButton
          icon={<PenLineIcon />}
          onClick={() => {
            setSelectedTool("line");
          }}
          activated={selectedTool == "line"}
        />
      </div>
    </div>
  );
}