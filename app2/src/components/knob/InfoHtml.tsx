import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";
import {Device} from "../../types.ts";
import {formatDuration} from "../../utils.ts";
import {useIntl} from "react-intl";
import {Fragment} from "react";

export const InfoHtml = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const flameMode = useContextSelector(LocalContext, c => c.flameMode);
    const flameModeSensor = useContextSelector(LocalContext, c => c.flameModeSensor);
    const flameOn = useContextSelector(LocalContext, c => c.flame);
    const flameDuration = useContextSelector(LocalContext, c => c.flameDuration);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const effectiveTemp = useContextSelector(LocalContext, c => c.effectiveTemp);
    const devices = useContextSelector(LocalContext, c => c.devices);
    const intl = useIntl();

    let statusIcon = (
        <div className="bg-slate-500 bg-linear-to-r from-slate-500 to-slate-400 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-slate-500/50 dark:from-slate-700 dark:to-slate-500 dark:text-slate-900 dark:shadow-slate-500/40">
            <div className="w-3 h-3 rounded-full bg-current"/>
            <span>{intl.formatMessage({id: "infoHtml.status.off"})}</span>
        </div>
    );

    if(mode === "manual" || mode === "schedule") {
        statusIcon = (
            <div className="bg-lime-600 bg-linear-to-r from-lime-600 to-lime-500 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-lime-500/50 dark:from-lime-700 dark:to-lime-500 dark:text-slate-900 dark:shadow-lime-500/40">
                <div className="w-3 h-3 rounded-full bg-current"/>
                <span>{intl.formatMessage({id: "infoHtml.status.idle"})}</span>
            </div>
        );
    }

    if(flameOn) {
        statusIcon = (
            <div className="bg-orange-600 bg-linear-to-r from-orange-600 to-orange-400 text-slate-100 ps-2 pe-3 py-1 rounded-full text-xs font-medium flex justify-center items-center gap-2 shadow-none shadow-orange-500/50 dark:from-orange-700 dark:to-orange-500 dark:text-slate-900 dark:shadow-orange-500/40">
                <div className="w-3 h-3 rounded-full bg-current"/>
                <span>{intl.formatMessage({id: "infoHtml.status.heating"})}</span>
            </div>
        );
    }

    let effectiveTempLabel = intl.formatMessage({id: "infoHtml.effectiveTemp.average"});
    if(flameMode === "one"){
        const activeDevice: Device | undefined = devices.find(d => d.id === flameModeSensor);
        effectiveTempLabel = activeDevice ? activeDevice.name.toUpperCase() : intl.formatMessage({id: "infoHtml.effectiveTemp.current"});
    }
    if(flameMode === "any"){
        effectiveTempLabel = intl.formatMessage({id: "infoHtml.effectiveTemp.lowest"});
    }
    if(flameMode === "all"){
        effectiveTempLabel = !flameOn ? intl.formatMessage({id: "infoHtml.effectiveTemp.highest"}) : intl.formatMessage({id: "infoHtml.effectiveTemp.lowest"});
    }

    return (
        <div className="pointer-events-none select-none flex flex-col justify-start items-center absolute top-0 bottom-0 left-0 right-0">
            <div className="h-16"/>
            <div className="text-sm text-orange-500">{effectiveTempLabel}</div>
            <div className="font-mono text-2xl text-slate-500/70">{effectiveTemp.toFixed(1)}°C</div>
            <div className="h-4"/>
            <div className="text-orange-600">{intl.formatMessage({id: "infoHtml.target"})}</div>
            <div className="font-mono text-5xl text-slate-500">{targetTemp.toFixed(1)}°C</div>
            <div className="h-4"/>
            <div className="text-sm text-slate-500/70">{flameOn ? intl.formatMessage({id: "infoHtml.flameDuration"}, {duration: formatDuration(flameDuration)}) : <Fragment>&nbsp;</Fragment>}</div>
            <div className="h-1"/>
            {statusIcon}
        </div>
    );
}
