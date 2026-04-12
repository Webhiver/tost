import {useCallback} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext, LocalContext} from "../../_context";
import {PanelType, Theme, Language} from "@/types.ts";
import { TbSettings, TbHeartRateMonitor, TbCloudDownload } from "react-icons/tb";
//import { TbCalendarClock, TbChartHistogram } from "react-icons/tb";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { CgDarkMode } from "react-icons/cg";
import { GrSatellite } from "react-icons/gr";
import {TostLogo} from "../Icons.jsx"
import clsx from "clsx";
import {FieldClasses, FieldSelectClasses} from "../../styles.ts";


const MainPanel = () => {

    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);
    const type = useContextSelector(LocalContext, c => c.type);
    const theme = useContextSelector(LocalContext, c => c.theme);
    const toggleTheme = useContextSelector(LocalContext, c => c.toggleTheme);
    const language = useContextSelector(LocalContext, c => c.language);
    const changeLanguage = useContextSelector(LocalContext, c => c.changeLanguage);

    const onOpenPanel = useCallback((panel: PanelType) => () => {
        togglePanel(panel, true);
    }, [togglePanel]);

    const onToggleTheme = useCallback((theme: Theme) => () => {
        toggleTheme(theme);
    }, [toggleTheme]);

    const onChangeLanguage = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        changeLanguage(event.target.value as Language);
    }, [changeLanguage]);

    return (
        <WrapperPanel type="main">
            <div className="h-full flex flex-col justify-center items-stretch px-20 -mt-6">
                <div className="flex flex-col justify-center items-center gap-2 px-4 pb-8 text-center">
                    <TostLogo width={90} height={24} className="fill-slate-500 dark:fill-slate-200"/>
                    <div className="text-sm text-slate-500">Version: 2.16.5</div>
                </div>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400" onClick={onOpenPanel("settings")}>
                    <TbSettings className="size-6"/>
                    SETTINGS
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"/>
                {type !== "satellite" &&
                    <>
                        {/*<div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400 line-through" onClick={onOpenPanel("schedule")}>*/}
                        {/*    <TbCalendarClock className="size-6"/>*/}
                        {/*    SCHEDULE*/}
                        {/*</div>*/}
                        {/*<div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"/>*/}
                        <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400" onClick={onOpenPanel("satellites")}>
                            <GrSatellite className="size-5"/>
                            SATELLITES
                        </div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"/>
                    </>
                }
                {/*<div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400 line-through" onClick={onOpenPanel("statistics")}>*/}
                {/*    <TbChartHistogram className="size-6"/>*/}
                {/*    STATISTICS*/}
                {/*</div>*/}
                {/*<div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"/>*/}
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400" onClick={onOpenPanel("monitoring")}>
                    <TbHeartRateMonitor className="size-6"/>
                    MONITORING
                </div>
                <div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent"/>
                <div className="flex justify-center items-center gap-2 scale-100 hover:scale-120 transition-transform cursor-pointer px-4 py-4 text-center text-xl text-slate-500 dark:text-slate-400" onClick={onOpenPanel("updates")}>
                    <TbCloudDownload className="size-6"/>
                    UPDATES
                </div>
                <div className="flex flex-col justify-center items-center gap-2 px-4 mt-8 text-center text-xl text-slate-500 dark:text-slate-400">
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
                <div className="flex flex-col justify-center items-center gap-2 px-4 mt-8 text-center text-lg text-slate-500 dark:text-slate-400">
                    <label htmlFor={`field-language`} className="text-slate-500 flex items-center dark:text-slate-400">Language</label>
                    <select
                        id={`field-language`}
                        className={clsx(FieldClasses, FieldSelectClasses, "text-center")}
                        value={language}
                        onChange={onChangeLanguage}
                    >
                        <option value="en">English</option>
                        <option value="ro">Română</option>
                    </select>
                </div>
            </div>
        </WrapperPanel>
    );
}

export default MainPanel;
