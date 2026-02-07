// @ts-ignore
import {TostLogo} from "./Icons.jsx"
import { MdOutlineMenuOpen } from "react-icons/md";
import { TbCloudDownload } from "react-icons/tb";
import {MouseEvent} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../_context";
import {useCallback} from "react";

const Header = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);

    const onOpen = useCallback((_event: MouseEvent) => {
        togglePanel("main", true);
    }, [togglePanel]);

    return (
        <header className="flex justify-between items-center gap-4 px-6 py-4">
            <TostLogo width={90} height={24} className="fill-slate-500 dark:fill-slate-200"/>
            <div className="flex-1"/>
            <TbCloudDownload className="text-sky-600 size-6 dark:text-sky-400 cursor-pointer animate-bounce"/>
            <MdOutlineMenuOpen className="fill-slate-500 size-8 dark:fill-slate-200 cursor-pointer" onClick={onOpen}/>
        </header>
    )
}

export default Header