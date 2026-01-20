import {useCallback, useRef, KeyboardEvent, WheelEvent} from "react";
// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"
import {ArcBackground} from './knob/ArcBackground';
import {ArcProgress} from './knob/ArcProgress.tsx';
import {ScaleBackground} from './knob/ScaleBackground';
import {ScaleProgress} from './knob/ScaleProgress';
import {Pointer} from './knob/Pointer';
import {Info} from './knob/Info';
import {useContextSelector} from "@fluentui/react-context-selector";
import AppContext from "../_context";
import {clamp, getPercentageFromValue, findClosest} from "./knob/utils";

export const stepsToSnapTo = (steps: number, snap: boolean): number[] | undefined => {
    if (steps && snap) {
        return Array.from({length: steps + 1}, (_, i) => (1 / steps) * i);
    }
    return undefined;
}

const Controller = () => {

    const targetTemp = useContextSelector(AppContext, c => c.targetTemp);
    const knobSize = useContextSelector(AppContext, c => c.knobSize);
    const knobMinTemp = useContextSelector(AppContext, c => c.knobMinTemp);
    const knobMaxTemp = useContextSelector(AppContext, c => c.knobMaxTemp);
    const knobSteps = useContextSelector(AppContext, c => c.knobSteps);
    const setTargetTemp = useContextSelector(AppContext, c => c.setTargetTemp);
    const setKnobPercentage = useContextSelector(AppContext, c => c.setKnobPercentage);

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
        let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, newTargetTemp);
        const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
        if(stepSnappingPercentages){
            percentage = findClosest(stepSnappingPercentages, percentage);
        }

        setKnobPercentage(percentage);
        setTargetTemp(newTargetTemp);

    }, [knobSteps, knobMinTemp, knobMaxTemp, targetTemp]);

    const handleKeyUp = useCallback(() => {

    }, []);

    const handleMouseWheel = useCallback((event: WheelEvent) => {
        const direction = event.deltaX < 0 || event.deltaY > 0 ? -1 : event.deltaX > 0 || event.deltaY < 0 ? 1 : 0;

        if (event.cancelable) {
            event.preventDefault();
        }

        const newTargetTemp = clamp(knobMinTemp, knobMaxTemp, targetTemp + ((knobMaxTemp - knobMinTemp) / knobSteps) * direction);
        let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, newTargetTemp);
        const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
        if(stepSnappingPercentages){
            percentage = findClosest(stepSnappingPercentages, percentage);
        }

        setKnobPercentage(percentage);
        setTargetTemp(newTargetTemp);

    }, [knobSteps, knobMinTemp, knobMaxTemp, targetTemp]);

    return (
        <div
            className="flex justify-center items-center gap-4 px-6 outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onWheel={handleMouseWheel}
        >
            <div ref={rootRef}>
                <svg ref={svgRef} width={knobSize} height={knobSize}>
                    <ArcBackground/>
                    <ScaleBackground/>
                    <ArcProgress/>
                    <ScaleProgress/>
                    <Pointer rootRef={rootRef}/>
                    <Info/>
                </svg>
            </div>
        </div>
    )
}

export default Controller