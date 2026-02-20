// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../_context";
import {useCallback} from "react";
import {OperatingMode} from "../types.ts";

const Modes = () => {
    const type = useContextSelector(LocalContext, c => c.type);
    const mode = useContextSelector(LocalContext, c => c.mode);
    const setMode = useContextSelector(LocalContext, c => c.setMode);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);

    const onChangeMode = useCallback((mode: OperatingMode) => () => {
        if(type === "satellite"){
            return;
        }
        setMode(mode);
        submitConfig({operating_mode: mode});
    }, [submitConfig, type]);

    return (
        <div className="flex justify-center items-center gap-6 pb-5">
            <div
                onClick={type === "host" ? onChangeMode("off") : undefined}
                className="data-active:cursor-pointer text-slate-400/75 data-active:hover:text-slate-600 font-medium data-selected:text-red-700 data-selected:cursor-default dark:text-slate-200/75 dark:data-active:hover:text-slate-100 dark:data-selected:text-red-400"
                data-active={type === "host" ? "true" : undefined}
                data-selected={mode === "off" ? "true" : undefined}
            >
                OFF
            </div>
            <div
                onClick={type === "host" ? onChangeMode("manual") : undefined}
                className="data-active:cursor-pointer text-slate-400/75 data-active:hover:text-slate-600 font-medium data-selected:text-lime-600 data-selected:cursor-default dark:text-slate-200/75 dark:data-active:hover:text-slate-100 dark:data-selected:text-lime-400"
                data-active={type === "host" ? "true" : undefined}
                data-selected={mode === "manual" ? "true" : undefined}
            >
                MANUAL
            </div>
            <div
                onClick={type === "host" ? onChangeMode("schedule") : undefined}
                className="data-active:cursor-pointer text-slate-400/75 data-active:hover:text-slate-600 font-medium data-selected:text-sky-600 data-selected:cursor-default dark:text-slate-200/75 dark:data-active:hover:text-slate-100 dark:data-selected:text-sky-400"
                data-active={type === "host" ? "true" : undefined}
                data-selected={mode === "schedule" ? "true" : undefined}
            >
                SCHEDULE
            </div>
        </div>
    )
}

export default Modes