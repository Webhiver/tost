import {useCallback, MouseEvent, TouchEvent, useRef, useState, useEffect} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {MdClose, MdOutlineKeyboardArrowLeft} from "react-icons/md";
import {AiOutlineLoading} from "react-icons/ai";
import {PanelsContext} from "../../_context";
import {PanelType} from "@/types.ts";
import { TbSettings, TbCalendarClock, TbChartHistogram, TbHeartRateMonitor, TbCloudDownload } from "react-icons/tb";
import { GrSatellite } from "react-icons/gr";
import {PiHandSwipeRight} from "react-icons/pi";

interface Props {
    type: PanelType
    children?: React.ReactNode
}

const WrapperPanel = (props: Props) => {

    const {
        type,
        children,
    } = props;

    const loading = useContextSelector(PanelsContext, c => c.loading);
    const saving = useContextSelector(PanelsContext, c => c.saving);
    const saveResult = useContextSelector(PanelsContext, c => c.saveResult);
    const animationSpeed = useContextSelector(PanelsContext, c => c.panelsAnimationSpeed);
    const mainPanelOpen = useContextSelector(PanelsContext, c => c.mainPanelOpen);
    const settingsPanelOpen = useContextSelector(PanelsContext, c => c.settingsPanelOpen);
    const schedulePanelOpen = useContextSelector(PanelsContext, c => c.schedulePanelOpen);
    const satellitesPanelOpen = useContextSelector(PanelsContext, c => c.satellitesPanelOpen);
    const statisticsPanelOpen = useContextSelector(PanelsContext, c => c.statisticsPanelOpen);
    const monitoringPanelOpen = useContextSelector(PanelsContext, c => c.monitoringPanelOpen);
    const updatesPanelOpen = useContextSelector(PanelsContext, c => c.updatesPanelOpen);


    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);
    const touchStartX = useRef<number | null>(null);
    const [open, setOpen] = useState(false);
    const [renderContent, setRenderContent] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        switch (type) {
            case "main":
                setOpen(mainPanelOpen);
                break;
            case "settings":
                setOpen(settingsPanelOpen);
                break;
            case "schedule":
                setOpen(schedulePanelOpen);
                break;
            case "satellites":
                setOpen(satellitesPanelOpen);
                break;
            case "statistics":
                setOpen(statisticsPanelOpen);
                break;
            case "monitoring":
                setOpen(monitoringPanelOpen);
                break;
            case "updates":
                setOpen(updatesPanelOpen);
                break;
            default:
                setOpen(false);
        }
    }, [type, mainPanelOpen, settingsPanelOpen, schedulePanelOpen, satellitesPanelOpen, statisticsPanelOpen, monitoringPanelOpen, updatesPanelOpen]);

    const onClose = useCallback((_event: MouseEvent) => {
        togglePanel(type, false);
    }, [type, togglePanel]);

    const onTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
        if (!open) {
            return;
        }
        touchStartX.current = event.touches[0]?.clientX ?? null;
        setIsDragging(true);
    }, [open]);

    const onTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
        if (touchStartX.current === null) {
            return;
        }

        const currentX = event.touches[0]?.clientX ?? touchStartX.current;
        const deltaX = Math.max(0, currentX - touchStartX.current);
        if (deltaX > 20) {
            setDragOffset(deltaX - 20);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (dragOffset > 70) {
            togglePanel(type, false);
        }
        touchStartX.current = null;
        setDragOffset(0);
        setIsDragging(false);
    }, [type, dragOffset, togglePanel]);

    useEffect(() => {
        if (open) {
            setRenderContent(true);
        } else {
            setTimeout(() => setRenderContent(false), animationSpeed);
        }
    }, [open]);

    let title = (
        <div className="flex justify-start items-center gap-4 px-4 py-4 text-slate-500 text-xl">
            <div className="flex-1"/>
            <MdClose className="fill-slate-500 size-8 cursor-pointer" onClick={onClose}/>
        </div>
    );
    if(type !== "main") {
        title = (
            <div className="flex justify-start items-center gap-2 px-4 py-4 text-slate-500 text-xl border-b border-slate-300">
                {type === "settings" && <TbSettings className="size-6"/>}
                {type === "schedule" && <TbCalendarClock className="size-6"/>}
                {type === "satellites" && <GrSatellite className="size-5"/>}
                {type === "statistics" && <TbChartHistogram className="size-6"/>}
                {type === "monitoring" && <TbHeartRateMonitor className="size-6"/>}
                {type === "updates" && <TbCloudDownload className="size-6"/>}
                <h1 className="mr-2">SETTINGS</h1>
                {saving &&
                    <div className="flex justify-start items-center gap-1 text-green-500">
                        <div className="size-3 border border-green-700/15 rounded-full relative">
                            <AiOutlineLoading
                                className="text-green-600 animate-spin size-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
                        </div>
                        <span className="text-xs">Saving</span>
                    </div>
                }
                {!saving && saveResult === 'success' &&
                    <div className="flex justify-start items-center gap-1 text-green-500">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span className="text-xs">Saved</span>
                    </div>
                }
                {!saving && saveResult === 'error' &&
                    <div className="flex justify-start items-center gap-1 text-red-600">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <span className="text-xs">Save failed</span>
                    </div>
                }
                <div className="flex-1"/>
                <MdOutlineKeyboardArrowLeft className="fill-slate-500 size-10 cursor-pointer" onClick={onClose}/>
            </div>
        );
    }

    return (
        <div
            data-open={open}
            data-content-visible={renderContent ? 'true' : undefined}
            style={{
                transitionDuration: isDragging ? '0ms' : `${animationSpeed}ms`,
                transform: open ? `translateX(${dragOffset}px)` : undefined,
                zIndex: type === "main" ? 100 : 101
            }}
            aria-hidden={!open}
            className="flex flex-col items-stretch justify-stretch absolute inset-0 bg-linear-to-b from-slate-100 to-slate-200 lg:rounded-3xl shadow-none data-content-visible:shadow-lg translate-x-full transition-transform data-[open=true]:translate-x-0 select-none overflow-hidden overflow-y-auto"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {title}
            <div className="flex-1 overflow-y-auto px-4 relative">
                {renderContent && children}
            </div>
            {type === "main" && <div className="pb-2 text-sm text-slate-500 flex justify-center items-center gap-2 "><PiHandSwipeRight/>Swipe right to close</div>}
            {type !== "main" && <div className="pb-2 text-sm text-slate-500 flex justify-center items-center gap-2 "><PiHandSwipeRight/>Swipe right to go back</div>}
            {Boolean(loading && type !== "main") &&
                <div
                    className="absolute inset-0 backdrop-blur-sm z-102 flex flex-col gap-2 justify-center items-center">
                    <div className="size-10 border-3 border-slate-300 rounded-full relative">
                        <AiOutlineLoading
                            className="text-sky-500 animate-spin size-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
                    </div>
                    <div className="text-lg text-slate-500 animate-pulse">
                        Loading
                        <span className="text-3xl">.</span>
                        <span className="text-3xl">.</span>
                        <span className="text-3xl">.</span>
                    </div>
                </div>
            }
        </div>
    );
}

export default WrapperPanel;
