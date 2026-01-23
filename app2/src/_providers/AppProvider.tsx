import {ReactNode, useCallback, useEffect, useState, useRef} from "react";
import {AppContext} from "../_context";
import {fetchStatus} from "../api";
import {findClosest, getPercentageFromValue, stepsToSnapTo} from "../components/knob/utils.ts";

const refreshInterval = 4000;

const AppProvider = ({children}: { children: ReactNode }) => {
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

    const abortControllerRef = useRef<AbortController | null>(null);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [, setError] = useState<any>(null);

    const cancelPendingFetch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const refresh = useCallback(async () => {
        // if (!isLoading) {
        //     return;
        // }

        cancelPendingFetch();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const data = await fetchStatus(controller.signal);
            console.log('data', data);

            if (!controller.signal.aborted) {
                setFlame(data.state.flame);
                setFlameDuration(data.state.flame_duration);
                setWifiConnected(data.state.wifi_connected);
                setWifiStrength(data.state.wifi_strength);
                setIsPairing(data.state.is_pairing);
                setTargetTemp(data.config.target_temperature);
                setEffectiveTemp(data.state.effective_temperature ?? 0);
                setError(null);

                let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, data.config.target_temperature);
                const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
                if (stepSnappingPercentages) {
                    percentage = findClosest(stepSnappingPercentages, percentage);
                }
                setKnobPercentage(percentage);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            setError('Connection failed');
            console.error('Failed to fetch status:', err);
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
            // Clear the ref if this controller is still the current one
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [isLoading, cancelPendingFetch]);

    const startRefreshing = useCallback(() => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = setInterval(refresh, refreshInterval);
    }, [refresh]);

    const resetAndStartRefreshing = useCallback(async () => {
        cancelPendingFetch();
        await refresh();
        startRefreshing();
    }, [cancelPendingFetch, refresh, startRefreshing]);

    useEffect(() => {
        console.log('initial use effect');
        refresh();
        startRefreshing();
        return () => {
            cancelPendingFetch();
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        }
    }, [refresh, startRefreshing, cancelPendingFetch]);

    return (
        <AppContext.Provider value={{
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
            cancelPendingFetch,
            resetAndStartRefreshing,
        }}>
            {children}
        </AppContext.Provider>
    )
}

export default AppProvider;