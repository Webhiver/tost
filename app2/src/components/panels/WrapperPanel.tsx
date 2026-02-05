import {useCallback, MouseEvent, TouchEvent, useRef, useState, useEffect} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import { MdClose, MdOutlineKeyboardArrowLeft } from "react-icons/md";
import {PanelsContext} from "../../_context";
import {PanelType} from "@/types.ts";

interface Props {
    type: PanelType
    children?: React.ReactNode
}

const WrapperPanel = (props: Props) => {

    const {
        type,
        children,
    } = props;

    const animationSpeed = useContextSelector(PanelsContext, c => c.panelsAnimationSpeed);
    const mainPanelOpen = useContextSelector(PanelsContext, c => c.mainPanelOpen);
    const settingsPanelOpen = useContextSelector(PanelsContext, c => c.settingsPanelOpen);
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
    }, [type, mainPanelOpen, settingsPanelOpen, satellitesPanelOpen, statisticsPanelOpen, monitoringPanelOpen, updatesPanelOpen]);

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
        if(deltaX > 20){
            setDragOffset(deltaX - 20);
        }
    }, [togglePanel]);

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

    return (
        <div
            data-open={open}
            data-content-visible={renderContent ? 'true' : undefined}
            style={{
                transitionDuration: isDragging ? '0ms' : `${animationSpeed}ms`,
                transform: open ? `translateX(${dragOffset}px)` : undefined,
                zIndex: type === "main" ? 100 : 101
            }}
            className="flex flex-col items-stretch justify-start absolute inset-0 bg-linear-to-b from-slate-100 to-slate-200 lg:rounded-3xl shadow-none data-content-visible:shadow-lg translate-x-full transition-transform data-[open=true]:translate-x-0 select-none overflow-hidden overflow-y-auto" aria-hidden="true"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {type === "main" ?
                <MdClose className="fill-slate-500 size-8 cursor-pointer absolute top-4 right-5" onClick={onClose}/> :
                <MdOutlineKeyboardArrowLeft className="fill-slate-500 size-10 cursor-pointer absolute top-3 right-5" onClick={onClose}/>
            }
            {renderContent && children}
        </div>
    );
}

export default WrapperPanel;
