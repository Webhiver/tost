import {useCallback} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext, LocalContext} from "../../_context";
import {PanelType, Theme} from "@/types.ts";
import { TbSettings, TbCalendarClock, TbChartHistogram, TbHeartRateMonitor, TbCloudDownload } from "react-icons/tb";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { CgDarkMode } from "react-icons/cg";
import { GrSatellite } from "react-icons/gr";


const MainPanel = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);
    const type = useContextSelector(LocalContext, c => c.type);
    const theme = useContextSelector(LocalContext, c => c.theme);
    const toggleTheme = useContextSelector(LocalContext, c => c.toggleTheme);

    const onOpenPanel = useCallback((panel: PanelType) => () => {
        togglePanel(panel, true);
    }, [togglePanel]);

    const onToggleTheme = useCallback((theme: Theme) => () => {
        toggleTheme(theme);
    }, [toggleTheme]);

    return (
        <WrapperPanel type="main">
            <div className="h-full flex flex-col justify-center items-stretch px-20 -mt-6">
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
                        <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 line-through" onClick={onOpenPanel("schedule")}>
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
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 line-through" onClick={onOpenPanel("statistics")}>
                    <TbChartHistogram className="size-6"/>
                    STATISTICS
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 line-through" onClick={onOpenPanel("monitoring")}>
                    <TbHeartRateMonitor className="size-6"/>
                    MONITORING
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500" onClick={onOpenPanel("updates")}>
                    <TbCloudDownload className="size-6"/>
                    UPDATES
                </div>
                <div className="flex flex-col justify-center items-center gap-2 px-4 mt-8 text-center text-xl text-slate-500">
                    <div className="flex justify-center items-center gap-6">
                        <div onClick={onToggleTheme("light")} data-active={theme === "light" ? "true" : undefined} className="cursor-pointer flex flex-col justify-center items-center gap-1 hover:scale-110 transition-transform data-active:text-sky-600">
                            <MdLightMode className="cursor-pointer size-8"/>
                            <div className="text-sm">LIGHT</div>
                        </div>
                        <div onClick={onToggleTheme("dark")} data-active={theme === "dark" ? "true" : undefined} className="cursor-pointer flex flex-col justify-center items-center gap-1 hover:scale-110 transition-transform data-active:text-sky-600">
                            <MdDarkMode className="cursor-pointer size-8"/>
                            <div className="text-sm">DARK</div>
                        </div>
                        <div onClick={onToggleTheme(undefined)} data-active={theme === undefined ? "true" : undefined} className="cursor-pointer flex flex-col justify-center items-center gap-1 hover:scale-110 transition-transform data-active:text-sky-600">
                            <CgDarkMode className="cursor-pointer size-8"/>
                            <div className="text-sm">SYSTEM</div>
                        </div>
                    </div>
                </div>
            </div>
        </WrapperPanel>
    );
}

export default MainPanel;
