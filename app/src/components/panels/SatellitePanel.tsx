import {useCallback, MouseEvent, TouchEvent, useRef, useState, useEffect} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../../_context";
import {AiOutlineLoading} from "react-icons/ai";
import {useIntl} from "react-intl";

const SatellitePanel = () => {

    // const touchAvailable = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const intl = useIntl();

    const viewSatellitePanel = useContextSelector(PanelsContext, c => c.viewSatellitePanel);
    const animationSpeed = useContextSelector(PanelsContext, c => c.panelsAnimationSpeed);

    const toggleViewSatellite = useContextSelector(PanelsContext, c => c.toggleViewSatellite);
    const touchStartX = useRef<number | null>(null);
    const [open, setOpen] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setOpen(Boolean(viewSatellitePanel?.id));
        if(Boolean(viewSatellitePanel?.id)){
            setIsLoading(true);
        }
    }, [viewSatellitePanel]);

    const onClose = useCallback((_event: MouseEvent) => {
        toggleViewSatellite(null);
    }, [toggleViewSatellite]);

    const onIframeLoaded = useCallback(() => {
        setTimeout(() => setIsLoading(false), 1000);
    }, []);

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
            toggleViewSatellite(null);
        }
        touchStartX.current = null;
        setDragOffset(0);
        setIsDragging(false);
    }, [dragOffset, toggleViewSatellite]);

    return (
        <div
            data-open={open}
            data-content-visible={'true'}
            style={{
                transitionDuration: isDragging ? '0ms' : `${animationSpeed}ms`,
                transform: open ? `translateX(${dragOffset}px)` : undefined,
                zIndex: 102
            }}
            aria-hidden={!open}
            className="flex flex-col items-stretch justify-stretch absolute inset-0 bg-linear-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 lg:rounded-3xl shadow-none data-content-visible:shadow-lg translate-x-full transition-transform data-[open=true]:translate-x-0 select-none overflow-hidden overflow-y-auto"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <iframe className="bg-white flex-1 relative" frameBorder={0} src={`http://${viewSatellitePanel?.ip}`} onLoad={onIframeLoaded}/>
            <div className="cursor-pointer py-2 justify-center items-center text-center" onClick={onClose}>Close</div>
            {isLoading &&
                <div
                    className="absolute inset-0 backdrop-blur-sm z-102 flex flex-col gap-2 justify-center items-center">
                    <div className="size-10 border-3 border-slate-300 dark:border-slate-700 rounded-full relative">
                        <AiOutlineLoading
                            className="text-sky-500 dark:text-sky-400 animate-spin size-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
                    </div>
                    <div className="text-lg text-slate-500 dark:text-slate-400 animate-pulse">
                        {intl.formatMessage({id: "panel.loading"})}
                    </div>
                </div>
            }
        </div>
    );
}

export default SatellitePanel;
