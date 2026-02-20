import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";

export const ScaleProgress = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const knobWidth = useContextSelector(LocalContext, c => c.knobWidth);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(LocalContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(LocalContext, c => c.knobAngleOffset);
    const knobTickWidth = useContextSelector(LocalContext, c => c.knobTickWidth);
    const knobTickHeight = useContextSelector(LocalContext, c => c.knobTickHeight);
    const knobSteps = useContextSelector(LocalContext, c => c.knobSteps);
    const knobScalePrecision = useContextSelector(LocalContext, c => c.knobScalePrecision);
    const knobPercentage = useContextSelector(LocalContext, c => c.knobPercentage);
    const knobRadius = knobSize / 2;
    const knobCenter = knobSize / 2;

    const stepSize = knobAngleRange / knobSteps;
    const length = knobSteps + (knobAngleRange === 360 ? 0 : 1);
    const translateX = knobCenter - knobTickWidth / 2;
    const translateY = knobCenter - knobRadius + (knobWidth / 2 - knobTickHeight / 2);
    const active = Math.round((length - 1) * knobPercentage);

    if(mode !== "manual"){
        return null;
    }

    return (
        <g>
            {Array.from({length}).map((_, index) => {
                const tickIsHalf = knobScalePrecision !== 0.1 && knobScalePrecision !== 0.5 ? false : index % 2;

                return (
                    <rect
                        data-active={active === index && mode === "manual" ? 'true' : undefined}
                        data-hidden={active <= index ? 'true' : undefined}
                        className="fill-black/10 data-active:fill-white"
                        key={`scale-${index}`}
                        stroke={'none'}
                        width={knobTickWidth}
                        height={tickIsHalf ? knobTickHeight / 2 : knobTickHeight}
                        transform={`rotate(${knobAngleOffset + stepSize * index} ${knobCenter} ${knobCenter}) translate( ${translateX} ${tickIsHalf ? translateY + knobTickHeight/4 : translateY})`}
                        style={active === index ? {
                            transition: "0ms ease-in-out"
                        } : {
                            transition: "1000ms ease-in-out"
                        }}
                    />
                );
            })}
        </g>
    )
};