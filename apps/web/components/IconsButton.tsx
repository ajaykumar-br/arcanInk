import { ReactNode } from "react";

export function IconsButton({
  icon,
  onClick,
  activated,
}: {
  icon: ReactNode;
  onClick: () => void;
  activated: boolean;
}) {
  return (
    <div
      className={`m-2 pointer p-2 hover:bg-accent ${activated ? "text-primary border border-primary rounded-full" : "text-foreground"}`}
      onClick={onClick}
    >
      {icon}
    </div>
  );
}
