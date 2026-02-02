import {} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";
import {calcKnobArcPathRounded} from "./utils";

export const ArcBackground = () => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const knobWidth = useContextSelector(LocalContext, c => c.knobWidth);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(LocalContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(LocalContext, c => c.knobAngleOffset);

    const path = calcKnobArcPathRounded({
        angleOffset: knobAngleOffset,
        angleRange: knobAngleRange,
        arcWidth: knobWidth,
        center: knobSize / 2,
        percentage: 1,
        radius: knobSize / 2,
    });

    return (
        <g>
            <path
                data-disabled={mode === "off" ? "true" : undefined}
                className="fill-slate-300 dark:fill-slate-700"
                d={path}
            />
        </g>
    );
};