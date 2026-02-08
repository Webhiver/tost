import {ReactNode, useState, useRef, useCallback, useEffect} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, PanelsContext, LocalContext} from "../_context";
import {PendingConfigs, Configs, Config, PanelType, SatelliteConfig} from "../types.ts";
import {fetchConfig, fetchSatelliteConfig, updateConfig, updateSatelliteConfig} from "../api.ts";

const DEBOUNCE_MS = 750;
const RESULT_DISPLAY_MS = 5000;

function isValidMac(mac: string): boolean {
  if (!mac) return false
  // Normalize: remove colons/dashes and convert to lowercase
  const clean = mac.toLowerCase().replace(/[:\-]/g, '')
  if (clean.length !== 12) return false
  // Check all characters are hex
  return /^[0-9a-f]{12}$/.test(clean)
}

function normalizeMac(mac: string): string {
  if (!mac) return ''
  // Remove separators and convert to lowercase
  const clean = mac.toLowerCase().replace(/[:\-]/g, '')
  // Format with colons: aa:bb:cc:dd:ee:ff
  return clean.match(/.{1,2}/g)?.join(':') || ''
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

    const pendingUpdatesRef = useRef<PendingConfigs>({});
    const scheduleSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const responseSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const hostMac = useContextSelector(LocalContext, c => c.hostMac);
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
                }
                if (!satellite) {
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
        const updates = {[key]: value} as Partial<Config>;

        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            newConfigs[mac] = {...newConfigs[mac] as Config, ...updates};
            return newConfigs;
        });

        queueUpdate(updates, mac);
    }, [queueUpdate]);

    const onSatelliteConfigChange = useCallback((index: number, key: keyof SatelliteConfig, value: SatelliteConfig[keyof SatelliteConfig]) => {
        let satellites = [] as SatelliteConfig[];
        if(configs[hostMac]?.satellites){
            satellites = [...configs[hostMac]?.satellites];
        }
        satellites[index][key] = value;

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
    }, [queueUpdate, hostMac, configs]);

    const onAddSatellite = useCallback(() => {
        setConfigs(currentConfigs => {
            const newConfigs = {...currentConfigs};
            if (!newConfigs[hostMac]) {
                newConfigs[hostMac] = {} as Config;
            }
            newConfigs[hostMac].satellites = [...newConfigs[hostMac]?.satellites as SatelliteConfig[], {mac: '', name: ''}];
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
        if (satellitesPanelOpen) {
            getConfigs(false);
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
            onSatelliteConfigChange,
            onAddSatellite,
            onRemoveSatellite,
        }}>
            {children}
        </PanelsContext.Provider>
    )
}

export default PanelsProvider;