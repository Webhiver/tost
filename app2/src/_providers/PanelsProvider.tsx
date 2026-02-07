import {ReactNode, useState, useRef, useCallback, useEffect} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, PanelsContext, LocalContext} from "../_context";
import {PendingConfigs, Configs, Config, PanelType} from "../types.ts";
import {fetchConfig, fetchSatelliteConfig, updateConfig, updateSatelliteConfig} from "../api.ts";

const DEBOUNCE_MS = 750;
const RESULT_DISPLAY_MS = 5000;

const PanelsProvider = ({children}: { children: ReactNode }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
    const [panelsAnimationSpeed, _setAnimationSpeed] = useState<number>(300);
    const [mainPanelOpen, setMainPanelOpen] = useState<boolean>(false);
    const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false);
    const [schedulePanelOpen, setSchedulePanelOpen] = useState<boolean>(false);
    const [satellitesPanelOpen, setSatellitesPanelOpen] = useState<boolean>(false);
    const [statisticsPanelOpen, setStatisticsPanelOpen] = useState<boolean>(false);
    const [monitoringPanelOpen, setMonitoringPanelOpen] = useState<boolean>(false);
    const [updatesPanelOpen, setUpdatesPanelOpen] = useState<boolean>(false);
    const [configs, setConfigs] = useState<Configs>({} as Configs);

    const pendingUpdatesRef = useRef<PendingConfigs>({});
    const scheduleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const responseSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const stopGettingStatus = useContextSelector(ApiContext, c => c.stopGettingStatus);
    const resetAndStartGettingStatus = useContextSelector(ApiContext, c => c.resetAndStartGettingStatus);
    const devices = useContextSelector(LocalContext, c => c.devices);

    const getConfigs = useCallback(async (includeSatellites: boolean) => {
        setLoading(true);

        try {
            const configs = {} as Configs;

            for (const device of devices) {
                const mac = device.id;
                const ip = device.ip;
                const online = device.online;
                const satellite = device.satellite;

                if (satellite && includeSatellites) {
                    if (!online || !ip) {
                        configs[mac] = undefined;
                    } else {
                        const data = await fetchSatelliteConfig(ip);
                        configs[mac] = data;
                    }
                } else {
                    const data = await fetchConfig();
                    configs[mac] = data;
                }
            }

            setConfigs(configs);
        } catch (err) {

        } finally {
            setLoading(false);
        }
    }, [devices]);

    const onSaveCompleted = useCallback((result: 'success' | 'error') => {
        // Clear any existing result timer
        if (responseSaveTimerRef.current) {
            clearTimeout(responseSaveTimerRef.current)
        }
        setSaveResult(result)
        responseSaveTimerRef.current = setTimeout(() => {
            responseSaveTimerRef.current = null
            setSaveResult(null)
        }, RESULT_DISPLAY_MS)
    }, [])

    const flushUpdates = useCallback(async () => {
        if (Object.keys(pendingUpdatesRef.current).length === 0) return;

        setSaving(true);

        try {
            for (const device of devices) {
                const mac = device.id;
                const ip = device.ip;
                const satellite = device.satellite;
                const updates = pendingUpdatesRef.current[mac];

                if (!satellite && updates && Object.keys(updates).length > 0) {
                    console.log('Saving host config: ', updates);
                    await updateConfig(updates);
                }

                if (satellite && ip && updates && Object.keys(updates).length > 0) {
                    console.log(`Saving ${ip} satellite config: `, updates);
                    await updateSatelliteConfig(ip, updates);
                }
            }

            pendingUpdatesRef.current = {};
            onSaveCompleted('success');
        } catch (err) {
            console.error('Failed to update config:', err)
            onSaveCompleted('error');
        } finally {
            setSaving(false);
        }

    }, [devices, onSaveCompleted]);

    const scheduleFlush = useCallback(() => {
        if (scheduleSaveTimerRef.current) {
            clearTimeout(scheduleSaveTimerRef.current)
        }
        scheduleSaveTimerRef.current = setTimeout(() => {
            scheduleSaveTimerRef.current = null
            flushUpdates();
        }, DEBOUNCE_MS)
    }, [flushUpdates]);

    const queueUpdate = useCallback((updates: Partial<Config>, mac: string) => {
        if (!configs[mac]) return;

        // Skip if any numeric value is NaN
        for (const value of Object.values(updates)) {
            if (typeof value === 'number' && Number.isNaN(value)) return
        }

        // Update local state immediately
        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            newConfigs[mac] = {...newConfigs[mac] as Config, ...updates};
            return newConfigs;
        });

        // Notify parent for optimistic UI updates
        // !!!MAYBE NOT REQUIRED ANYMORE
        // if (!satellite) {
        //     onConfigUpdate?.(updates)
        // }

        // Accumulate pending updates and schedule flush
        const pendingUpdates = pendingUpdatesRef.current;
        pendingUpdates[mac] = {...pendingUpdates[mac], ...updates};
        pendingUpdatesRef.current = pendingUpdates;
        scheduleFlush();
    }, [configs]);

    const onConfigChange = useCallback((key: keyof Config, value: Config[keyof Config], mac: string) => {
        queueUpdate({[key]: value} as Partial<Config>, mac);
    }, [queueUpdate]);

    const togglePanel = useCallback((panel: PanelType, isOpen: boolean) => {
        if (isOpen && panel === "main") {
            console.log(`stop getting status because ${panel} panel was opened`);
            stopGettingStatus();
        }
        if (!isOpen && panel === "main") {
            console.log(`start getting status because ${panel} panel was closed`);
            resetAndStartGettingStatus();
        }

        switch (panel) {
            case "main":
                setMainPanelOpen(isOpen);
                break;
            case "settings":
                setSettingsPanelOpen(isOpen);
                break;
            case "schedule":
                setSchedulePanelOpen(isOpen);
                break;
            case "satellites":
                setSatellitesPanelOpen(isOpen);
                break;
            case "statistics":
                setStatisticsPanelOpen(isOpen);
                break;
            case "monitoring":
                setMonitoringPanelOpen(isOpen);
                break;
            case "updates":
                setUpdatesPanelOpen(isOpen);
                break;
            default:
                break;
        }
    }, [stopGettingStatus, resetAndStartGettingStatus]);

    useEffect(() => {
        if (settingsPanelOpen) {
            getConfigs(true);
        }
    }, [mainPanelOpen, settingsPanelOpen, satellitesPanelOpen, statisticsPanelOpen, monitoringPanelOpen, updatesPanelOpen, getConfigs]);

    return (
        <PanelsContext.Provider value={{
            loading,
            saving,
            saveResult,
            panelsAnimationSpeed,
            mainPanelOpen,
            settingsPanelOpen,
            schedulePanelOpen,
            satellitesPanelOpen,
            statisticsPanelOpen,
            monitoringPanelOpen,
            updatesPanelOpen,
            configs,
            togglePanel,
            onConfigChange,
        }}>
            {children}
        </PanelsContext.Provider>
    )
}

export default PanelsProvider;