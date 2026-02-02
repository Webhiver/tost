import {useCallback, useRef, KeyboardEvent, WheelEvent} from "react";
// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"
import {ArcBackground} from './knob/ArcBackground';
import {ArcProgress} from './knob/ArcProgress.tsx';
import {ScaleBackground} from './knob/ScaleBackground';
import {ScaleProgress} from './knob/ScaleProgress';
import {Pointer} from './knob/Pointer';
import {Info} from './knob/Info';
import {InfoHtml} from './knob/InfoHtml';
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../_context";
import {clamp} from "./knob/utils";

export const stepsToSnapTo = (steps: number, snap: boolean): number[] | undefined => {
    if (steps && snap) {
        return Array.from({length: steps + 1}, (_, i) => (1 / steps) * i);
    }
    return undefined;
}

const Controller = () => {

    const mode = useContextSelector(LocalContext, c => c.mode);
    const flame = useContextSelector(LocalContext, c => c.flame);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobMinTemp = useContextSelector(LocalContext, c => c.knobMinTemp);
    const knobMaxTemp = useContextSelector(LocalContext, c => c.knobMaxTemp);
    const knobSteps = useContextSelector(LocalContext, c => c.knobSteps);
    const setTargetTemp = useContextSelector(LocalContext, c => c.setTargetTemp);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);

    const rootRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : 0;

        if (!direction) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }

        const newTargetTemp = clamp(knobMinTemp, knobMaxTemp, targetTemp + ((knobMaxTemp - knobMinTemp) / knobSteps) * direction);
        setTargetTemp(newTargetTemp);

        submitConfig({target_temperature: newTargetTemp});

    }, [knobSteps, knobMinTemp, knobMaxTemp, targetTemp, submitConfig]);

    const handleKeyUp = useCallback(() => {

    }, []);

    const handleMouseWheel = useCallback((event: WheelEvent) => {
        const direction = event.deltaX < 0 || event.deltaY > 0 ? -1 : event.deltaX > 0 || event.deltaY < 0 ? 1 : 0;

        if (event.cancelable) {
            event.preventDefault();
        }

        const newTargetTemp = clamp(knobMinTemp, knobMaxTemp, targetTemp + ((knobMaxTemp - knobMinTemp) / knobSteps) * direction);
        setTargetTemp(newTargetTemp);

        submitConfig({target_temperature: newTargetTemp});

    }, [knobSteps, knobMinTemp, knobMaxTemp, targetTemp, submitConfig]);

    return (
        <div
            className="flex-1 flex justify-center items-center pt-7 pb-2 px-6 outline-none"
            data-active={flame ? "true" : undefined}
            tabIndex={0}
            onKeyDown={mode !== "off" ? handleKeyDown : undefined}
            onKeyUp={mode !== "off" ? handleKeyUp : undefined}
            onWheel={mode !== "off" ? handleMouseWheel : undefined}
        >
            <div ref={rootRef} className="relative">
                <svg ref={svgRef} width={knobSize} height={knobSize}>
                    <ArcBackground/>
                    <ScaleBackground/>
                    <ArcProgress/>
                    <ScaleProgress/>
                    <Pointer rootRef={rootRef}/>
                    {/*<Info/>*/}
                </svg>
                <InfoHtml/>
            </div>
        </div>
    )
}

export default Controller