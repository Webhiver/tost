import {useRef, useEffect, Fragment} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";

export const InfoHtml = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const flameOn = useContextSelector(LocalContext, c => c.flame);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const effectiveTemp = useContextSelector(LocalContext, c => c.effectiveTemp);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);

    let statusIcon = (
        <div className="border border-slate-400 bg-linear-to-r from-slate-200 to-transparent ps-2 pe-3 py-1 rounded-full text-slate-700 text-xs flex justify-center items-center gap-2 shadow-lg shadow-slate-400/20">
            <div className="w-3 h-3 rounded-full bg-slate-500"/>
            <span>OFF</span>
        </div>
    );

    if(mode === "manual" || mode === "schedule") {
        statusIcon = (
            <div className="border border-green-400 bg-linear-to-r from-green-200 to-transparent ps-2 pe-3 py-1 rounded-full text-green-700 text-xs flex justify-center items-center gap-2 shadow-lg shadow-green-400/20">
                <div className="w-3 h-3 rounded-full bg-green-500"/>
                <span>IDLE</span>
            </div>
        );
    }

    if(flameOn) {
        statusIcon = (
            <div className="border border-orange-400 bg-linear-to-r from-orange-200 to-transparent ps-2 pe-3 py-1 rounded-full text-orange-700 text-xs flex justify-center items-center gap-2 shadow-lg shadow-orange-400/20">
                <div className="w-3 h-3 rounded-full bg-orange-500"/>
                <span>HEATING</span>
            </div>
        );
    }

    return (
        <div className="pointer-events-none user-select-none flex flex-col justify-start items-center absolute top-0 bottom-0 left-0 right-0">
            <div className="h-16"/>
            <div className="text-sm text-orange-500">EFFECTIVE</div>
            <div className="font-mono text-2xl text-slate-500/70">{effectiveTemp.toFixed(1)}°C</div>
            <div className="h-3"/>
            <div className="text-orange-600">TARGET</div>
            <div className="font-mono text-5xl text-slate-500">{targetTemp.toFixed(1)}°C</div>
            <div className="h-6"/>
            {statusIcon}
        </div>
    );
}
