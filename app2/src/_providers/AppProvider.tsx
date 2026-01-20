import {ReactNode, useCallback, useEffect, useState, useRef} from "react";
import AppContext from "../_context";
import {fetchStatus} from "../api";
import {findClosest, getPercentageFromValue, stepsToSnapTo} from "../components/knob/utils.ts";

const AppProvider = ({children}: { children: ReactNode }) => {
    const refreshInterval = 4000;
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [flame, setFlame] = useState<boolean>(false);
    const [flameDuration, setFlameDuration] = useState<number>(0);
    const [isPairing, setIsPairing] = useState<boolean>(false);
    const [wifiConnected, setWifiConnected] = useState<boolean>(false);
    const [wifiStrength, setWifiStrength] = useState<number | null>(4);
    const [targetTemp, setTargetTemp] = useState<number>(0);

    const [knobSize] = useState(320);
    const [knobWidth] = useState(50);
    const [knobAngleRange] = useState(290);
    const [knobAngleOffset] = useState(215);
    const [knobMinTemp] = useState(5);
    const [knobMaxTemp] = useState(30);
    const [knobTickWidth] = useState(2);
    const [knobTickHeight] = useState(30);
    const [knobSteps] = useState((knobMaxTemp - knobMinTemp) * 2);
    const [knobPercentage, setKnobPercentage] = useState<number>(0);

    const [, setError] = useState<any>(null);

    const getStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchStatus();
            setFlame(data.flame);
            setFlameDuration(data.flame_duration);
            setWifiConnected(data.wifi_connected);
            setWifiStrength(data.wifi_strength);
            setIsPairing(data.is_pairing);
            setTargetTemp(data.config.target_temp);
            setError(null);

            let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, data.config.target_temp);
            const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
            if (stepSnappingPercentages) {
                percentage = findClosest(stepSnappingPercentages, percentage);
            }
            setKnobPercentage(percentage);
        } catch (err) {
            setError('Connection failed');
            console.error('Failed to fetch status:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        getStatus();
        refreshIntervalRef.current = setInterval(getStatus, refreshInterval);
        return () => {
            if(refreshIntervalRef.current){
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    return (
        <AppContext.Provider value={{
            isLoading,
            flame,
            flameDuration,
            isPairing,
            wifiConnected,
            wifiStrength,
            targetTemp,
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
        </AppContext.Provider>
    )
}

export default AppProvider;