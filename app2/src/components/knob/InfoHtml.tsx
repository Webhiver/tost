import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";
import {Device} from "../../types.ts";

export const InfoHtml = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const flameMode = useContextSelector(LocalContext, c => c.flameMode);
    const flameModeSensor = useContextSelector(LocalContext, c => c.flameModeSensor);
    const flameOn = useContextSelector(LocalContext, c => c.flame);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const effectiveTemp = useContextSelector(LocalContext, c => c.effectiveTemp);
    const devices = useContextSelector(LocalContext, c => c.devices);

    let statusIcon = (
        <div className="bg-slate-500 bg-linear-to-r from-slate-500 to-slate-400 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-slate-500/50 dark:from-slate-700 dark:to-slate-500 dark:text-slate-900 dark:shadow-slate-500/40">
            <div className="w-3 h-3 rounded-full bg-current"/>
            <span>OFF</span>
        </div>
    );

    if(mode === "manual" || mode === "schedule") {
        statusIcon = (
            <div className="bg-lime-600 bg-linear-to-r from-lime-600 to-lime-500 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-lime-500/50 dark:from-lime-700 dark:to-lime-500 dark:text-slate-900 dark:shadow-lime-500/40">
                <div className="w-3 h-3 rounded-full bg-current"/>
                <span>IDLE</span>
            </div>
        );
    }

    if(flameOn) {
        statusIcon = (
            <div className="bg-orange-600 bg-linear-to-r from-orange-600 to-orange-400 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-orange-500/50 dark:from-orange-700 dark:to-orange-500 dark:text-slate-900 dark:shadow-orange-500/40">
                <div className="w-3 h-3 rounded-full bg-current"/>
                <span>HEATING</span>
            </div>
        );
    }

    let effectiveTempLabel = "AVERAGE";
    if(flameMode === "one"){
        const activeDevice: Device | undefined = devices.find(d => d.id === flameModeSensor);
        effectiveTempLabel = activeDevice ? activeDevice.name.toUpperCase() : "CURRENT";
    }
    if(flameMode === "any"){
        effectiveTempLabel = "LOWEST";
    }
    if(flameMode === "all"){
        effectiveTempLabel = !flameOn ? "HIGHEST" : "LOWEST";
    }

    return (
        <div className="pointer-events-none user-select-none flex flex-col justify-start items-center absolute top-0 bottom-0 left-0 right-0">
            <div className="h-16"/>
            <div className="text-sm text-orange-500">{effectiveTempLabel}</div>
            <div className="font-mono text-2xl text-slate-500/70">{effectiveTemp.toFixed(1)}°C</div>
            <div className="h-4"/>
            <div className="text-orange-600">TARGET</div>
            <div className="font-mono text-5xl text-slate-500">{targetTemp.toFixed(1)}°C</div>
            <div className="h-9"/>
            {statusIcon}
        </div>
    );
}
