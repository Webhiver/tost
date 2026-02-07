import {useCallback} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext, LocalContext} from "../../_context";
import {PanelType} from "@/types.ts";
import { TbSettings, TbCalendarClock, TbChartHistogram, TbHeartRateMonitor, TbCloudDownload } from "react-icons/tb";
import { GrSatellite } from "react-icons/gr";

const MainPanel = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);
    const type = useContextSelector(LocalContext, c => c.type);

    const onOpenPanel = useCallback((panel: PanelType) => () => {
        togglePanel(panel, true);
    }, [togglePanel]);

    return (
        <WrapperPanel type="main">
            <div className="h-full flex flex-col justify-center items-stretch px-20">
                <div className="flex flex-col justify-center items-center gap-2 px-4 pb-8 text-center text-xl text-slate-500">
                    <div className="text-md font-extralight">Operating mode</div>
                    <div className="flex justify-center items-center gap-2">
                        <button data-active={type === "host" ? "true" : undefined} className="cursor-pointer border border-slate-400 rounded-md py-1 px-3 data-active:border-sky-400 data-active:text-sky-600 data-active:bg-sky-200 scale-100 hover:scale-110 transition-transform">HOST</button>
                        <button data-active={type === "satellite" ? "true" : undefined} className="cursor-pointer border border-slate-400 rounded-md py-1 px-3 data-active:border-sky-400 data-active:text-sky-600 data-active:bg-sky-200 scale-100 hover:scale-110 transition-transform">SENSOR</button>
                    </div>
                </div>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("settings")}>
                    <TbSettings className="size-6"/>
                    SETTINGS
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                {type !== "satellite" &&
                    <>
                        <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("satellites")}>
                            <TbCalendarClock className="size-6"/>
                            SCHEDULE
                        </div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                        <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("satellites")}>
                            <GrSatellite className="size-5"/>
                            SATELLITES
                        </div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                    </>
                }
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("statistics")}>
                    <TbChartHistogram className="size-6"/>
                    STATISTICS
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("monitoring")}>
                    <TbHeartRateMonitor className="size-6"/>
                    MONITORING
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("updates")}>
                    <TbCloudDownload className="size-6"/>
                    UPDATES
                </div>
            </div>
        </WrapperPanel>
    );
}

export default MainPanel;
