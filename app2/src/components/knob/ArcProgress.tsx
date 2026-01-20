import {Fragment} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import AppContext from "../../_context";
import {calcKnobArcPath} from "./utils";

export const ArcProgress = () => {
    const knobWidth = useContextSelector(AppContext, c => c.knobWidth);
    const knobSize = useContextSelector(AppContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(AppContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(AppContext, c => c.knobAngleOffset);
    const knobPercentage = useContextSelector(AppContext, c => c.knobPercentage);

    const path = calcKnobArcPath({
        angleOffset: knobAngleOffset,
        angleRange: knobAngleRange,
        arcWidth: knobWidth,
        center: knobSize / 2,
        percentage: knobPercentage,
        radius: knobSize / 2,
    });

    return (
        <g>
            <Fragment>
                <clipPath id="clip-path">
                    <path d={path}/>
                </clipPath>
                <foreignObject x={0} y={0} width={knobSize} height={knobSize} clipPath={`url(#clip-path)`}>
                    <div
                        style={{
                            width: knobSize,
                            height: knobSize,
                            background: "conic-gradient(from 180deg, var(--temp-color-1) 20%, var(--temp-color-2) 35%, var(--temp-color-3) 50%, var(--temp-color-4) 65%, var(--temp-color-5) 80%)"
                        }}
                    />
                </foreignObject>
            </Fragment>
        </g>
    );
};