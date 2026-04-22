import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../../_context";
import {
    calcKnobArcPathRounded,
    clamp,
    degToRad,
    pointOnCircle,
} from "./utils";
import {useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent} from "react";

export const ArcButtons = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const knobMinTemp = useContextSelector(LocalContext, c => c.knobMinTemp);
    const knobMaxTemp = useContextSelector(LocalContext, c => c.knobMaxTemp);
    const knobSteps = useContextSelector(LocalContext, c => c.knobSteps);
    const knobWidth = useContextSelector(LocalContext, c => c.knobWidth);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(LocalContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(LocalContext, c => c.knobAngleOffset);
    const setTargetTemp = useContextSelector(LocalContext, c => c.setTargetTemp);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);

    const complementAngle = Math.max(0, 360 - knobAngleRange);
    const capGap = 13;
    const splitGap = 13;
    const usableAngle = complementAngle - capGap * 2 - splitGap;
    const halfAngle = usableAngle / 2;
    const center = knobSize / 2;
    const radius = knobSize / 2;
    const labelRadius = radius - knobWidth / 2 - 1;
    const complementOffset = knobAngleOffset + knobAngleRange;

    if (complementAngle <= 0 || usableAngle <= 0) {
        return null;
    }

    const handleAction = useCallback((action: "decrease" | "increase") => (event: ReactMouseEvent | ReactTouchEvent) => {
        const direction = action === "increase" ? 1 : -1;

        if (event.cancelable) {
            event.preventDefault();
        }

        if(mode !== "manual"){
            return;
        }

        const newTargetTemp = clamp(knobMinTemp, knobMaxTemp, targetTemp + ((knobMaxTemp - knobMinTemp) / knobSteps) * direction);
        setTargetTemp(newTargetTemp);

        submitConfig({target_temperature: newTargetTemp});

    }, [mode, knobSteps, knobMinTemp, knobMaxTemp, targetTemp, submitConfig]);

    const leftArc = calcKnobArcPathRounded({
        angleOffset: complementOffset + capGap,
        angleRange: halfAngle,
        arcWidth: knobWidth,
        center,
        percentage: 1,
        radius,
    });

    const rightArc = calcKnobArcPathRounded({
        angleOffset: complementOffset + capGap + halfAngle + splitGap,
        angleRange: halfAngle,
        arcWidth: knobWidth,
        center,
        percentage: 1,
        radius,
    });

    const leftLabelAngleDeg = complementOffset + capGap + halfAngle / 2;
    const rightLabelAngleDeg = complementOffset + capGap + halfAngle + splitGap + halfAngle / 2;
    const leftLabelAngle = degToRad(leftLabelAngleDeg - 90);
    const rightLabelAngle = degToRad(rightLabelAngleDeg - 90);
    const leftLabelPoint = pointOnCircle(center, labelRadius, leftLabelAngle);
    const rightLabelPoint = pointOnCircle(center, labelRadius, rightLabelAngle);
    const minusPoint = leftLabelPoint.x <= rightLabelPoint.x ? leftLabelPoint : rightLabelPoint;
    const plusPoint = leftLabelPoint.x <= rightLabelPoint.x ? rightLabelPoint : leftLabelPoint;
    //const maskId = "arc-buttons-mask";

    return (
        <g>
            {/*<defs>*/}
            {/*    <mask id={maskId} maskUnits="userSpaceOnUse">*/}
            {/*        <rect x={0} y={0} width={knobSize} height={knobSize} fill="white"/>*/}
            {/*        <text*/}
            {/*            x={minusPoint.x}*/}
            {/*            y={minusPoint.y}*/}
            {/*            textAnchor="middle"*/}
            {/*            dominantBaseline="middle"*/}
            {/*            transform={`rotate(${-leftLabelAngleDeg} ${minusPoint.x} ${minusPoint.y})`}*/}
            {/*            className="font-mono text-3xl users-select-none"*/}
            {/*            fill="black"*/}
            {/*        >*/}
            {/*            -*/}
            {/*        </text>*/}
            {/*        <text*/}
            {/*            x={plusPoint.x}*/}
            {/*            y={plusPoint.y}*/}
            {/*            textAnchor="middle"*/}
            {/*            dominantBaseline="middle"*/}
            {/*            transform={`rotate(${-rightLabelAngleDeg} ${plusPoint.x} ${plusPoint.y})`}*/}
            {/*            className="font-mono text-3xl users-select-none"*/}
            {/*            fill="black"*/}
            {/*        >*/}
            {/*            +*/}
            {/*        </text>*/}
            {/*    </mask>*/}
            {/*</defs>*/}
            {/*<g mask={`url(#${maskId})`}>*/}
                <path
                    data-disabled={mode !== "manual" ? "true" : undefined}
                    className="cursor-pointer transition-colors fill-slate-300 dark:fill-slate-700 active:fill-slate-400/60 dark:active:fill-slate-600 hover:fill-slate-400/60 dark:hover:fill-slate-600 data-disabled:pointer-events-none"
                    d={leftArc}
                    onClick={handleAction("increase")}
                />
                <path
                    data-disabled={mode !== "manual" ? "true" : undefined}
                    className="cursor-pointer transition-colors fill-slate-300 dark:fill-slate-700 active:fill-slate-400/60 dark:active:fill-slate-600 hover:fill-slate-400/60 dark:hover:fill-slate-600 data-disabled:pointer-events-none"
                    d={rightArc}
                    onClick={handleAction("decrease")}
                />
                <text
                    x={minusPoint.x}
                    y={minusPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${-leftLabelAngleDeg} ${minusPoint.x} ${minusPoint.y})`}
                    className="font-mono text-3xl users-select-none pointer-events-none fill-black/30 dark:fill-slate-500"
                >
                    -
                </text>
                <text
                    x={plusPoint.x}
                    y={plusPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${-rightLabelAngleDeg} ${plusPoint.x} ${plusPoint.y})`}
                    className="font-mono text-3xl users-select-none pointer-events-none fill-black/30 dark:fill-slate-500"
                >
                    +
                </text>
            {/*</g>*/}
        </g>
    );
};
