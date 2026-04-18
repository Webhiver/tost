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
    const knobScalePrecision = useContextSelector(LocalContext, c => c.knobScalePrecision);
    const knobRadius = knobSize / 2;
    const knobCenter = knobSize / 2;

    const stepSize = knobAngleRange / knobSteps;
    const length = knobSteps + (knobAngleRange === 360 ? 0 : 1);
    const translateX = knobCenter - knobTickWidth / 2;
    const translateY = knobCenter - knobRadius + (knobWidth / 2 - knobTickHeight / 2);

    return (
        <g>
            {Array.from({length}).map((_, index) => {
                const tickIsHalf = knobScalePrecision !== 0.5 ? false : index % 2;

                return (
                    <rect
                        className="fill-black/20 dark:fill-slate-500"
                        key={`scale-${index}`}
                        stroke={'none'}
                        width={knobTickWidth}
                        height={tickIsHalf ? knobTickHeight / 2 : knobTickHeight}
                        transform={`rotate(${knobAngleOffset + stepSize * index} ${knobCenter} ${knobCenter}) translate( ${translateX} ${tickIsHalf ? translateY + knobTickHeight/4 : translateY})`}
                    />
                );
            })}
        </g>
    )
};