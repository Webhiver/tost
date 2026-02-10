import {ReactNode, useEffect, useState, useCallback} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {ApiContext, LocalContext} from "../_context";
import {findClosest, getPercentageFromValue, stepsToSnapTo} from "../components/knob/utils.ts";
import {Satellite, Device, SatelliteConfig, OperatingMode, Theme} from "../types.ts";

const LocalProvider = ({children}: { children: ReactNode }) => {
    const state = useContextSelector(ApiContext, c => c.state);
    const config = useContextSelector(ApiContext, c => c.config);

    const [theme, setTheme] = useState<Theme>(localStorage.getItem('theme') ? localStorage.getItem('theme') as Theme : undefined);
    const [type, setType] = useState<'host' | 'satellite'>('host');
    const [mode, setMode] = useState<OperatingMode>('off');
    const [flame, setFlame] = useState<boolean>(false);
    const [flameMode, setFlameMode] = useState<string>('average');
    const [flameModeSensor, setFlameModeSensor] = useState<string|null>(null);
    const [flameDuration, setFlameDuration] = useState<number>(0);
    const [isPairing, setIsPairing] = useState<boolean>(false);
    const [wifiConnected, setWifiConnected] = useState<boolean>(false);
    const [wifiStrength, setWifiStrength] = useState<number | null>(4);
    const [targetTemp, setTargetTemp] = useState<number>(0);
    const [effectiveTemp, setEffectiveTemp] = useState<number>(0);
    const [satellites, setSatellites] = useState<Satellite[]>([]);
    const [hostMac, setHostMac] = useState<string>('');
    const [hostName, setHostName] = useState<string>('Host');
    const [hostHealthy, setHostHealthy] = useState<boolean>(true);
    const [hostHumidity, setHostHumidity] = useState<number | null>(null);
    const [hostTemperature, setHostTemperature] = useState<number | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);

    const [knobSize] = useState(340);
    const [knobWidth] = useState(50);
    const [knobAngleRange] = useState(290);
    const [knobAngleOffset] = useState(215);
    const [knobMinTemp] = useState(5);
    const [knobMaxTemp] = useState(30);
    const [knobTickWidth] = useState(2);
    const [knobTickHeight] = useState(30);
    const [knobSteps] = useState((knobMaxTemp - knobMinTemp) * 2);
    const [knobPercentage, setKnobPercentage] = useState<number>(0);

    const toggleTheme = useCallback((theme: Theme) => {
        switch (theme) {
            case 'light':
                localStorage.setItem('theme', 'light');
                break;
            case 'dark':
                localStorage.setItem('theme', 'dark');
                break;
            default:
                localStorage.removeItem('theme');
        }
        setTheme(theme);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            document.documentElement.classList.toggle("dark", theme === "dark" || (theme === undefined && mediaQuery.matches));
        };
        apply();

        if (theme !== undefined) return;

        const handler = () => apply();
        mediaQuery.addEventListener("change", handler);

        return () => {
            mediaQuery.removeEventListener("change", handler);
        };
    }, [theme]);

    useEffect(() => {
        setFlame(state?.flame ?? false);
        setFlameDuration(state?.flame_duration ?? 0);
        setEffectiveTemp(state?.effective_temperature ?? 0);
        setWifiConnected(state?.wifi_connected ?? false);
        setWifiStrength(state?.wifi_strength ?? 0);
        setSatellites(state?.satellites ?? []);
        setHostHealthy(state?.sensor?.healthy ?? true);
        setHostHumidity(state?.sensor?.humidity ?? null);
        setHostTemperature(state?.sensor?.temperature ?? null);
        setIsPairing(state?.is_pairing ?? false);
        setHostMac(state?.mac ?? '');
    }, [state]);


    useEffect(() => {
        setType(config?.mode ?? 'host');
        setMode(config?.operating_mode ?? 'off');
        setFlameMode(config?.flame_mode ?? 'average');
        setFlameModeSensor(config?.flame_mode === 'one' ? config?.flame_mode_sensor : null);
        setTargetTemp(config?.target_temperature ?? 0);
        setHostName(config?.name ?? 'Host');
    }, [config]);

    useEffect(() => {
        let percentage = getPercentageFromValue(knobMinTemp, knobMaxTemp, targetTemp);
        const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
        if (stepSnappingPercentages) {
            percentage = findClosest(stepSnappingPercentages, percentage);
        }
        setKnobPercentage(percentage);
    }, [targetTemp, knobMinTemp, knobMaxTemp, knobSteps]);

    useEffect(() => {
        const devices: Device[] = [];
        devices.push({
            id: state?.mac ?? `satellite-0`,
            ip: undefined,
            satellite: false,
            name: config?.name ?? 'Host',
            online: true,
            healthy: state?.sensor?.healthy ?? false,
            error: state?.sensor?.message ?? "Sensor not detected",
            wifiStrength: state?.wifi_strength ?? 0,
            temperature: state?.sensor?.temperature ?? null,
            humidity: state?.sensor?.humidity ?? null,
            active:
                ((config?.flame_mode === "average" || config?.flame_mode === "all" || config?.flame_mode === "any") && config?.local_sensor === "included") ||
                (config?.flame_mode === "one" && config?.flame_mode_sensor === "local"),
        });
        config?.satellites.forEach((satellite: SatelliteConfig, index: number) => {
            const satelliteState: Satellite | undefined = state?.satellites?.[index];

            devices.push({
                id: satellite?.mac ?? `satellite-${index + 1}`,
                ip:satelliteState?.ip ?? undefined,
                satellite: true,
                name: satellite?.name ?? 'Host',
                online: satelliteState?.online ?? false,
                healthy: satelliteState?.state?.sensor?.healthy ?? false,
                error: satelliteState?.state?.sensor?.message ?? "Sensor not detected",
                wifiStrength: satelliteState?.state?.wifi_strength ?? 0,
                temperature: satelliteState?.state?.sensor?.temperature ?? null,
                humidity: satelliteState?.state?.sensor?.humidity ?? null,
                active: config?.flame_mode === "average" || config?.flame_mode === "all" || config?.flame_mode === "any" || config?.flame_mode === "one" && config?.flame_mode_sensor === satellite?.mac,
            });
        });

        setDevices(devices);
    }, [state, config]);

    return (
        <LocalContext.Provider value={{
            theme,
            type,
            hostMac,
            hostName,
            hostHealthy,
            hostHumidity,
            hostTemperature,
            mode,
            flame,
            flameMode,
            flameModeSensor,
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
            satellites,
            devices,
            setMode,
            setTargetTemp,
            setKnobPercentage,
            toggleTheme,
        }}>
            {children}
        </LocalContext.Provider>
    )
}

export default LocalProvider;