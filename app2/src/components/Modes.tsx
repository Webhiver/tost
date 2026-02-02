// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../_context";
import {useCallback} from "react";
import {OperatingMode} from "../types.ts";

const Modes = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const setMode = useContextSelector(LocalContext, c => c.setMode);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);

    const onChangeMode = useCallback((mode: OperatingMode) => () => {
        setMode(mode);
        submitConfig({operating_mode: mode});
    }, [submitConfig]);

    return (
        <div className="flex justify-center items-center gap-6 pb-5">
            <div onClick={onChangeMode("off")} className="cursor-pointer text-slate-400/75 hover:text-slate-600 font-medium data-selected:text-red-700 data-selected:cursor-default dark:text-slate-200/75 dark:hover:text-slate-100 dark:data-selected:text-red-400" data-selected={mode === "off" ? "true" : undefined}>OFF</div>
            <div onClick={onChangeMode("manual")} className="cursor-pointer text-slate-400/75 hover:text-slate-600 font-medium data-selected:text-lime-600 data-selected:cursor-default dark:text-slate-200/75 dark:hover:text-slate-100 dark:data-selected:text-lime-400" data-selected={mode === "manual" ? "true" : undefined}>MANUAL</div>
            <div onClick={onChangeMode("schedule")} className="cursor-pointer text-slate-400/75 hover:text-slate-600 font-medium data-selected:text-sky-600 data-selected:cursor-default dark:text-slate-200/75 dark:hover:text-slate-100 dark:data-selected:text-sky-400" data-selected={mode === "schedule" ? "true" : undefined}>SCHEDULE</div>
        </div>
    )
}

export default Modes