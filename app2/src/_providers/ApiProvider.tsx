import {ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {ApiContext} from "../_context";
import {fetchStatus, updateConfig} from "../api";
import {State, Config} from "../types.ts";

const refreshInterval = 4000;

const ApiProvider = ({children}: { children: ReactNode }) => {
    const submitConfigDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const getStatusAbortControllerRef = useRef<AbortController | null>(null);
    const submitConfigAbortControllerRef = useRef<AbortController | null>(null);
    const getStatusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [config, setConfig] = useState<Config | null>(null);
    const [state, setState] = useState<State | null>(null);
    const [_error, setError] = useState<any>(null);

    const cancelPendingGetStatus = useCallback(() => {
        if (getStatusAbortControllerRef.current) {
            getStatusAbortControllerRef.current.abort();
            getStatusAbortControllerRef.current = null;
        }
    }, []);

    const cancelPendingSubmitConfig = useCallback(() => {
        if (submitConfigAbortControllerRef.current) {
            submitConfigAbortControllerRef.current.abort();
            submitConfigAbortControllerRef.current = null;
        }
    }, []);

    const getStatus = useCallback(async () => {
        cancelPendingGetStatus();

        const controller = new AbortController();
        getStatusAbortControllerRef.current = controller;

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
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
            if (getStatusAbortControllerRef.current === controller) {
                getStatusAbortControllerRef.current = null;
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

    const submitConfig = useCallback((config: Partial<Config>) => {
        cancelPendingSubmitConfig();
        stopGettingStatus();
        cancelPendingGetStatus();

        if (submitConfigDebounceRef.current) {
            clearTimeout(submitConfigDebounceRef.current)
        }

        const controller = new AbortController();
        submitConfigAbortControllerRef.current = controller;

        submitConfigDebounceRef.current = setTimeout(async () => {
            submitConfigDebounceRef.current = null
            try {
                await updateConfig(config, controller.signal)

                getStatus();
                startGettingStatus();
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
                console.error('Failed to update config:', err)

                getStatus();
                startGettingStatus();
            } finally {
                if (submitConfigDebounceRef.current === controller) {
                    submitConfigAbortControllerRef.current = null;
                }
            }
        }, 1000);
    }, [cancelPendingGetStatus, getStatus, startGettingStatus, stopGettingStatus, cancelPendingSubmitConfig]);

    const onConfigsUpdated = useCallback((configs: Partial<Config>) => {
        setConfig(prev => prev ? { ...prev, ...configs } : null);
    }, []);

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
            isLoading,
            config,
            state,
            submitConfig,
            startGettingStatus,
            stopGettingStatus,
            resetAndStartGettingStatus,
            cancelPendingGetStatus,
            cancelPendingSubmitConfig,
            onConfigsUpdated,
        }}>
            {children}
        </ApiContext.Provider>
    )
}

export default ApiProvider;