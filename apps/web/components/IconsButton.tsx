import { Button } from "@repo/ui/button";
import { ReactNode } from "react";

export function IconsButton({icon, onClick, activated}: {icon: ReactNode, onClick: ()=>void, activated: boolean}) {
    return <div className={`m-2 pointer rounded-full border p-2 bg-black hover:bg-gray ${activated ? "text-red-500" : "text-white"}`} onClick={onClick}>
            {icon}
        </div>
}