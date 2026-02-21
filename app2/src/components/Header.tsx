// @ts-ignore
import {TostLogo} from "./Icons.jsx"
import { MdOutlineMenuOpen } from "react-icons/md";
import { TbCloudDownload } from "react-icons/tb";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../_context";
import {useCallback} from "react";
import {PanelType} from "@/types.ts";

const Header = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);
    const type = useContextSelector(LocalContext, c => c.type);
    const isPairing = useContextSelector(LocalContext, c => c.isPairing)

    const onOpenPanel = useCallback((panel: PanelType) => () => {
        togglePanel(panel, true);
    }, [togglePanel]);

    return (
        <header className="flex justify-between items-center gap-4 px-6 py-4">
            <TostLogo width={90} height={24} className="fill-slate-500 dark:fill-slate-200"/>
            <div className="flex-1"/>
            {!isPairing && <TbCloudDownload className="text-sky-600 size-6 dark:text-sky-400 cursor-pointer animate-bounce" onClick={onOpenPanel("updates")}/>}
            {type === "host" && !isPairing ? <MdOutlineMenuOpen className="fill-slate-500 size-8 dark:fill-slate-200 cursor-pointer" onClick={onOpenPanel("main")}/> : null}
        </header>
    )
}

export default Header