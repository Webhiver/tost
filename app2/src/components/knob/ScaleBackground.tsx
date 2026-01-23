import {LocalContext} from "../../_context";
import {useContextSelector} from "@fluentui/react-context-selector";

export const ScaleBackground = () => {
    const knobWidth = useContextSelector(LocalContext, c => c.knobWidth);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(LocalContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(LocalContext, c => c.knobAngleOffset);
    const knobTickWidth = useContextSelector(LocalContext, c => c.knobTickWidth);
    const knobTickHeight = useContextSelector(LocalContext, c => c.knobTickHeight);
    const knobSteps = useContextSelector(LocalContext, c => c.knobSteps);
    const knobRadius = knobSize / 2;
    const knobCenter = knobSize / 2;

    const stepSize = knobAngleRange / knobSteps;
    const length = knobSteps + (knobAngleRange === 360 ? 0 : 1);
    const translateX = knobCenter - knobTickWidth / 2;
    const translateY = knobCenter - knobRadius + (knobWidth / 2 - knobTickHeight / 2);

    return (
        <g>
            {Array.from({length}).map((_, index) => {
                return (
                    <rect
                        className="fill-slate-400/40"
                        key={`scale-${index}`}
                        stroke={'none'}
                        width={knobTickWidth}
                        height={index % 2 ? knobTickHeight / 2 : knobTickHeight}
                        transform={`rotate(${knobAngleOffset + stepSize * index} ${knobCenter} ${knobCenter}) translate( ${translateX} ${index % 2 ? translateY + knobTickHeight/4 : translateY})`}
                    />
                );
            })}
        </g>
    )
};