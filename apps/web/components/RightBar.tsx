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
            setSelectedTool("RECT");
          }}
          activated={selectedTool == "RECT"}
        />
        <IconsButton
          icon={<Circle />}
          onClick={() => {
            setSelectedTool("CIRCLE");
          }}
          activated={selectedTool == "CIRCLE"}
        />
        <IconsButton
          icon={<PenLineIcon />}
          onClick={() => {
            setSelectedTool("LINE");
          }}
          activated={selectedTool == "LINE"}
        />
      </div>
    </div>
  );
}
