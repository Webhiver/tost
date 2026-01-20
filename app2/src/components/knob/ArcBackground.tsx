import {} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import AppContext from "../../_context";
import {calcKnobArcPath} from "./utils";

export const ArcBackground = () => {
    const knobWidth = useContextSelector(AppContext, c => c.knobWidth);
    const knobSize = useContextSelector(AppContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(AppContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(AppContext, c => c.knobAngleOffset);

    const path = calcKnobArcPath({
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
                className="fill-slate-300"
                d={path}
            />
        </g>
    );
};