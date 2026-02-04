import {useCallback, MouseEvent} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import { MdClose } from "react-icons/md";
import {PanelsContext} from "../../_context";

const MainPanel = () => {

    const animationSpeed = useContextSelector(PanelsContext, c => c.panelsAnimationSpeed);
    const open = useContextSelector(PanelsContext, c => c.mainPanelOpen);
    const togglePanel = useContextSelector(PanelsContext, c => c.togglePanel);

    const onClose = useCallback((_event: MouseEvent) => {
        togglePanel("main", false);
    }, [togglePanel]);

    return (
        <div
            data-open={open}
            style={{transitionDuration: `${animationSpeed}ms`}}
            className="absolute inset-0 bg-linear-to-b from-slate-100 to-white z-100 lg:rounded-3xl data-[open=true]:shadow-xl flex flex-col justify-start items-stretch translate-x-full transition-transform data-[open=true]:translate-x-0 select-none" aria-hidden="true"
        >
            <div className="flex justify-end items-center gap-4 px-6 py-4">
                <MdClose className="fill-slate-500 size-8 dark:fill-slate-200 cursor-pointer" onClick={onClose}/>
            </div>
            <div className="flex-1 flex justify-center items-center">
                {open &&
                    <div className="flex-1 flex flex-col justify-center items-stretch px-20">
                        <div className="scale-100 hover:scale-120 active:scale-120 transition-transform cursor-pointer flex-1 px-4 py-4 text-center text-xl text-slate-500">SETTINGS</div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                        <div className="scale-100 hover:scale-120 active:scale-120 transition-transform cursor-pointer flex-1 px-4 py-4 text-center text-xl text-slate-500">SATELLITES</div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                        <div className="scale-100 hover:scale-120 active:scale-120 transition-transform cursor-pointer flex-1 px-4 py-4 text-center text-xl text-slate-500">STATISTICS</div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                        <div className="scale-100 hover:scale-120 active:scale-120 transition-transform cursor-pointer flex-1 px-4 py-4 text-center text-xl text-slate-500">MONITORING</div>
                        <div className="h-px bg-linear-to-r from-transparent via-slate-300 to-transparent"/>
                        <div className="scale-100 hover:scale-120 active:scale-120 transition-transform cursor-pointer flex-1 px-4 py-4 text-center text-xl text-slate-500">UPDATES</div>
                    </div>
                }
            </div>
        </div>
    );
}

export default MainPanel;