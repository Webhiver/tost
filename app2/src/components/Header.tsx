// @ts-ignore
import {TostLogo} from "./Icons.jsx"
import { MdOutlineMenuOpen, MdCloudDownload } from "react-icons/md";
import {MouseEvent} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../_context";
import {useCallback} from "react";

const Header = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);

    const onOpen = useCallback((_event: MouseEvent) => {
        togglePanel("main");
    }, [togglePanel]);

    return (
        <header className="flex justify-between items-center gap-4 px-6 py-4">
            <TostLogo width={90} height={24} className="fill-slate-500 dark:fill-slate-200"/>
            <div className="flex-1"/>
            <MdCloudDownload className="fill-sky-600 size-6 dark:fill-slate-200 cursor-pointer animate-pulse"/>
            <MdOutlineMenuOpen className="fill-slate-500 size-8 dark:fill-slate-200 cursor-pointer" onClick={onOpen}/>
        </header>
    )
}

export default Header