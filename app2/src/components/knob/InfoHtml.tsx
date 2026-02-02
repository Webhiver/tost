import {useRef, useEffect, Fragment} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";

export const InfoHtml = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const flameOn = useContextSelector(LocalContext, c => c.flame);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const effectiveTemp = useContextSelector(LocalContext, c => c.effectiveTemp);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);

    return (
        <div className="pointer-events-none user-select-none flex flex-col justify-start items-center absolute top-0 bottom-0 left-0 right-0">
            <div className="h-16"/>
            <div className="text-sm text-orange-500">EFFECTIVE</div>
            <div className="font-mono text-2xl text-slate-500">{effectiveTemp.toFixed(1)}°C</div>
            <div className="h-5"/>
            <div className="text-orange-600">TARGET</div>
            <div className="font-mono text-5xl text-slate-500">{targetTemp.toFixed(1)}°C</div>
            <div className="h-20"/>
            <div className="border border-orange-300 bg-orange-200 px-2 rounded-full text-orange-600">HEATING</div>
        </div>
    );
}
