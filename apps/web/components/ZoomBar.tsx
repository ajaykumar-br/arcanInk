import React from "react";
import { IconsButton } from "./IconsButton";
import { MinusIcon, PlusIcon, Redo2Icon, Undo2Icon } from "lucide-react";

type ZoomBarProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

const ZoomBar = ({ zoom, onZoomIn, onZoomOut, onReset, onUndo, onRedo }: ZoomBarProps) => {
  return (
    <div className="fixed right-10 bottom-10 z-10 flex items-center rounded-md bg-card border border-border py-2 h-10 text-foreground">
      <IconsButton icon={<Undo2Icon className="w-3" />} onClick={onUndo} activated={false} />
      <IconsButton icon={<Redo2Icon className="w-3" />} onClick={onRedo} activated={false} />
      <span className="w-px h-5 bg-border" />
      <IconsButton icon={<MinusIcon className="w-3" />} onClick={onZoomOut} activated={false} />
      <button
        type="button"
        onClick={onReset}
        title="Reset zoom"
        className="w-12 text-xs text-center text-muted-foreground hover:text-foreground"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconsButton icon={<PlusIcon className="w-3" />} onClick={onZoomIn} activated={false} />
    </div>
  );
};

export default ZoomBar;
