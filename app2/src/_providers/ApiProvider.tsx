import {ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {ApiContext} from "../_context";
import {fetchStatus, updateConfig} from "../api";
import {State, Config} from "../types.ts";

const refreshInterval = 4000;

const ApiProvider = ({children}: { children: ReactNode }) => {
    const submitConfigDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const getStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [config, setConfig] = useState<Config | null>(null);
    const [state, setState] = useState<State | null>(null);
    const [_error, setError] = useState<any>(null);

    const cancelPendingGetStatus = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const getStatus = useCallback(async () => {
        cancelPendingGetStatus();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const data = await fetchStatus(controller.signal);

            if (!controller.signal.aborted) {
                setState(data.state);
                setConfig(data.config);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            setError('Connection failed');
            console.error('Failed to fetch status:', err);
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [cancelPendingGetStatus]);

    const startGettingStatus = useCallback(() => {
        if (getStatusIntervalRef.current) {
            clearInterval(getStatusIntervalRef.current);
        }
        getStatusIntervalRef.current = setInterval(getStatus, refreshInterval);
    }, [getStatus]);

    const stopGettingStatus = useCallback(() => {
        if (getStatusIntervalRef.current) {
            clearInterval(getStatusIntervalRef.current);
        }
    }, []);

    const resetAndStartGettingStatus = useCallback(async () => {
        cancelPendingGetStatus();
        await getStatus();
        startGettingStatus();
    }, [cancelPendingGetStatus, getStatus, startGettingStatus]);

    const submitConfig = useCallback((targetTemp: number) => {
        console.log(targetTemp);

        stopGettingStatus();
        cancelPendingGetStatus();

        if (submitConfigDebounceRef.current) {
            clearTimeout(submitConfigDebounceRef.current)
        }

        submitConfigDebounceRef.current = setTimeout(async () => {
            submitConfigDebounceRef.current = null
            try {
                await updateConfig({target_temperature: targetTemp})
            } catch (err) {
                console.error('Failed to update target temp:', err)
            } finally {
                getStatus();
                startGettingStatus();
            }
        }, 500);
    }, [cancelPendingGetStatus, getStatus, startGettingStatus, stopGettingStatus]);

    useEffect(() => {
        return () => {
            if (submitConfigDebounceRef.current) {
                clearTimeout(submitConfigDebounceRef.current)
            }
        }
    }, []);

    useEffect(() => {
        console.log('initial use effect');
        getStatus();
        startGettingStatus();
        return () => {
            cancelPendingGetStatus();
            if (getStatusIntervalRef.current) {
                clearInterval(getStatusIntervalRef.current);
            }
        }
    }, [getStatus, startGettingStatus, cancelPendingGetStatus]);

    return (
        <ApiContext.Provider value={{
            config,
            state,
            submitConfig,
            startGettingStatus,
            stopGettingStatus,
            resetAndStartGettingStatus,
            cancelPendingGetStatus,
        }}>
            {children}
        </ApiContext.Provider>
    )
}

export default ApiProvider;