import AppContext from "../../_context";
import {useContextSelector} from "@fluentui/react-context-selector";

export const ScaleBackground = () => {
    const knobWidth = useContextSelector(AppContext, c => c.knobWidth);
    const knobSize = useContextSelector(AppContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(AppContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(AppContext, c => c.knobAngleOffset);
    const knobTickWidth = useContextSelector(AppContext, c => c.knobTickWidth);
    const knobTickHeight = useContextSelector(AppContext, c => c.knobTickHeight);
    const knobSteps = useContextSelector(AppContext, c => c.knobSteps);
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