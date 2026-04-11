import {ReactNode, useState, useRef, useCallback, useEffect} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, PanelsContext, LocalContext} from "../_context";
import {PendingConfigs, Configs, Config, PanelType, SatelliteConfig, PanelProviderErrors, DeviceError} from "../types.ts";
import {fetchConfig, fetchSatelliteConfig, updateConfig, updateSatelliteConfig, reboot, ping} from "../api.ts";
import {isValidMac, normalizeMac} from "../utils.ts";

const DEBOUNCE_MS = 750;
const RESULT_DISPLAY_MS = 5000;

const validateConfigs = (key: keyof Config, value: Config[keyof Config]) => {
    const errors: DeviceError = {} as DeviceError;

    if (key === "mode") {
        if(!["host", "satellite"].includes(value as string)){
            errors["mode"] = "Invalid role";
        }
    }

    if (key === "operating_mode") {
        if(!["off", "manual", "schedule"].includes(value as string)){
            errors["operating_mode"] = "Invalid operating mode";
        }
    }

    if (key === "hysteresis") {
        if (Number.isNaN(Number(value))) {
            errors["hysteresis"] = "Hysteresis is required";
        }
        if ((Number(value) < 0.1 || Number(value) > 5)) {
            errors["hysteresis"] = "Hysteresis must be between 0.1°C and 5°C";
        }
    }

    if(key === "flame_mode") {
        if(!["average", "all", "any", "one"].includes(value as string)) {
            errors["flame_mode"] = "Invalid flame mode";
        }
    }
    if(key === "flame_mode_sensor") {
        if(!value || value === "") {
            errors["flame_mode"] = "Invalid flame mode";
        }
    }

    if(key === "local_sensor") {
        if(!["include", "fallback"].includes(value as string)) {
            errors["flame_mode"] = "Value must be Include or Fallback";
        }
    }

    if (key === "sensor_temperature_offset") {
        if ((Number(value) < -10 || Number(value) > 10)) {
            errors["sensor_temperature_offset"] = "Value must be between -10°C and 10°C";
        }
    }

    if (key === "sensor_humidity_offset") {
        if ((Number(value) < -20 || Number(value) > 20)) {
            errors["sensor_humidity_offset"] = "Value must be between -20% and 20%";
        }
    }

    if (key === "satellite_grace_period") {
        if ((Number(value) < 10 || Number(value) > 600)) {
            errors["satellite_grace_period"] = "Value must be between 10 and 600";
        }
    }

    if (key === "max_flame_duration") {
        if ((Number(value) < 1 || Number(value) > 24)) {
            errors["max_flame_duration"] = "Value must be between 1 and 24";
        }
    }

    if (key === "led_brightness") {
        if ((Number(value) < 0 || Number(value) > 100)) {
            errors["led_brightness"] = "Value must be between 0 and 100";
        }
    }

    return errors;
}

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
    const [validationErrors, setValidationErrors] = useState<PanelProviderErrors>({} as PanelProviderErrors);

    const pendingUpdatesRef = useRef<PendingConfigs>({});
    const scheduleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const responseSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const hostMac = useContextSelector(LocalContext, c => c.mac);
    const stopGettingStatus = useContextSelector(ApiContext, c => c.stopGettingStatus);
    const resetAndStartGettingStatus = useContextSelector(ApiContext, c => c.resetAndStartGettingStatus);
    //const onConfigsUpdated = useContextSelector(ApiContext, c => c.onConfigsUpdated);
    const devices = useContextSelector(LocalContext, c => c.devices);

    const getConfigs = useCallback(async (includeSatellites: boolean) => {
        setLoading(true);
        setValidationErrors({});

        try {
            const configs = {} as Configs;

            const requests = devices.map(device => {
                const mac = device.id;
                const ip = device.ip;
                const online = device.online;
                const satellite = device.satellite;

                if (satellite && includeSatellites) {
                    if (!online || !ip) {
                        return Promise.resolve({mac, data: undefined});
                    }
                    return fetchSatelliteConfig(ip).then(data => ({mac, data}));
                }

                if (!satellite) {
                    return fetchConfig().then(data => ({mac, data}));
                }

                return Promise.resolve({mac, data: undefined});
            });

            const results = await Promise.allSettled(requests);

            for (const result of results) {
                if (result.status === "fulfilled") {
                    configs[result.value.mac] = result.value.data;
                } else {

                }
            }

            // Ensure every device key exists even if its request failed
            for (const device of devices) {
                const mac = device.id;
                if (!(mac in configs)) {
                    configs[mac] = undefined;
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

        // Notify API provider for optimistic UI updates
        //onConfigsUpdated(updates);

        // Accumulate pending updates and schedule flush
        const pendingUpdates = pendingUpdatesRef.current;
        pendingUpdates[mac] = {...pendingUpdates[mac], ...updates};
        pendingUpdatesRef.current = pendingUpdates;
        scheduleFlush();
    }, [configs]);

    const onConfigChange = useCallback((key: keyof Config, value: Config[keyof Config], mac: string) => {
        const updates = {[key]: value} as Partial<Config>;

        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            newConfigs[mac] = {...newConfigs[mac] as Config, ...updates};
            return newConfigs;
        });

        const errors = validateConfigs(key, value) as DeviceError;

        setValidationErrors(currentValidationErrors => {
            const newValidationErrors = {...currentValidationErrors};
            newValidationErrors[mac] = {...errors};
            return newValidationErrors;
        });

        if(Object.values(errors).length > 0){
            return;
        }

        queueUpdate(updates, mac);
    }, [queueUpdate]);

    const onSatelliteConfigChange = useCallback((index: number, key: keyof SatelliteConfig, value: SatelliteConfig[keyof SatelliteConfig]) => {
        const originalSatellitesCount = (configs[hostMac]?.satellites ?? []).length;
        const satellites = (configs[hostMac]?.satellites ?? []).map(sat => ({ ...sat }));
        satellites[index][key] = value;

        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            newConfigs[hostMac] = {...newConfigs[hostMac] as Config, ...{satellites: satellites}};
            return newConfigs;
        });

        const validSatellites = (satellites as SatelliteConfig[])
            .filter(sat => isValidMac(sat.mac))
            .map(sat => ({ ...sat, mac: normalizeMac(sat.mac) }));

        if(validSatellites.length !== originalSatellitesCount){
            return;
        }

        queueUpdate({satellites: validSatellites}, hostMac);
    }, [queueUpdate, hostMac, configs]);

    const onAddSatellite = useCallback(() => {
        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            if (!newConfigs[hostMac]) {
                newConfigs[hostMac] = {} as Config;
            }
            newConfigs[hostMac].satellites = [...newConfigs[hostMac]?.satellites as SatelliteConfig[], {mac: '', name: `Satellite ${newConfigs[hostMac]?.satellites.length + 1}`}];
            return newConfigs;
        });
    }, [hostMac]);

    const onRemoveSatellite = useCallback((index: number) => {
        let satellites = [] as SatelliteConfig[];
        if(configs[hostMac]?.satellites){
            satellites = [...configs[hostMac]?.satellites];
        }
        satellites = satellites.filter((_, i) => i !== index);

        const updates = {satellites: satellites} as Partial<Config>;

        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            newConfigs[hostMac] = {...newConfigs[hostMac] as Config, ...updates};
            return newConfigs;
        });

        updates.satellites = (updates.satellites || [] as SatelliteConfig[])
            .filter(sat => isValidMac(sat.mac))
            .map(sat => ({ ...sat, mac: normalizeMac(sat.mac) }));

        queueUpdate(updates, hostMac);
    }, [hostMac, configs]);

    const onReboot = useCallback(async (ip?: string) => {
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        setLoading(true);

        try {
            await reboot(ip);

            while (true) {
                try {
                    const pingResponse = await ping(ip);
                    if (pingResponse?.status === "ok") {
                        break;
                    }
                } catch (err) {
                    // Ignore ping errors while device is rebooting
                }
                await sleep(2000);
            }
        } finally {
            setLoading(false);
            //getConfigs(true);
        }
    }, []);

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

    const toggleLoading = useCallback((isLoading: boolean) => setLoading(isLoading), []);

    useEffect(() => {
        if (settingsPanelOpen) {
            getConfigs(true);
        }
        if (satellitesPanelOpen) {
            getConfigs(false);
        }
    }, [mainPanelOpen, settingsPanelOpen, satellitesPanelOpen, statisticsPanelOpen, monitoringPanelOpen, updatesPanelOpen, getConfigs]);

    return (
        <PanelsContext.Provider value={{
            loading,
            saving,
            saveResult,
            validationErrors,
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
            onSatelliteConfigChange,
            onAddSatellite,
            onRemoveSatellite,
            onReboot,
            toggleLoading,
        }}>
            {children}
        </PanelsContext.Provider>
    )
}

export default PanelsProvider;
