import {ReactNode, useEffect, useState} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../_context";
import {findClosest, getPercentageFromValue, stepsToSnapTo} from "../components/knob/utils.ts";

const LocalProvider = ({children}: { children: ReactNode }) => {
    const state = useContextSelector(ApiContext, c => c.state);
    const config = useContextSelector(ApiContext, c => c.config);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [flame, setFlame] = useState<boolean>(false);
    const [flameDuration, setFlameDuration] = useState<number>(0);
    const [isPairing, setIsPairing] = useState<boolean>(false);
    const [wifiConnected, setWifiConnected] = useState<boolean>(false);
    const [wifiStrength, setWifiStrength] = useState<number | null>(4);
    const [targetTemp, setTargetTemp] = useState<number>(0);
    const [effectiveTemp, setEffectiveTemp] = useState<number>(0);

    const [knobSize] = useState(320);
    const [knobWidth] = useState(50);
    const [knobAngleRange] = useState(290);
    const [knobAngleOffset] = useState(215);
    const [knobMinTemp] = useState(5);
    const [knobMaxTemp] = useState(35);
    const [knobTickWidth] = useState(2);
    const [knobTickHeight] = useState(30);
    const [knobSteps] = useState((knobMaxTemp - knobMinTemp) * 2);
    const [knobPercentage, setKnobPercentage] = useState<number>(0);

    useEffect(() => {
        setFlame(state?.flame ?? false);
        setFlameDuration(state?.flame_duration ?? 0);
        setEffectiveTemp(state?.effective_temperature ?? 0);
    }, [state]);

    useEffect(() => {
        setTargetTemp(config?.target_temperature ?? 0);
    }, [config]);

    useEffect(() => {
        let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, targetTemp);
        const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
        if (stepSnappingPercentages) {
            percentage = findClosest(stepSnappingPercentages, percentage);
        }
        setKnobPercentage(percentage);
    }, [targetTemp, knobMinTemp, knobMaxTemp, knobSteps]);

    return (
        <LocalContext.Provider value={{
            isLoading,
            flame,
            flameDuration,
            isPairing,
            wifiConnected,
            wifiStrength,
            targetTemp,
            effectiveTemp,
            knobSize,
            knobWidth,
            knobAngleRange,
            knobAngleOffset,
            knobMinTemp,
            knobMaxTemp,
            knobTickWidth,
            knobTickHeight,
            knobSteps,
            knobPercentage,
            setTargetTemp,
            setKnobPercentage,
        }}>
            {children}
        </LocalContext.Provider>
    )
}

export default LocalProvider;