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
      className={`m-2 pointer p-2 hover:bg-gray ${activated ? "text-blue-400 border border-blue-300 rounded-full" : "text-white"}`}
      onClick={onClick}
    >
      {icon}
    </div>
  );
}
