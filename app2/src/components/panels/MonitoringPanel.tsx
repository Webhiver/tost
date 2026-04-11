import {useEffect, useState, useCallback} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {Device, AllDebugInfo} from "../../types.ts";
import {fetchDebug} from "../../api.ts";

const MonitoringPanel = () => {

    const devices = useContextSelector(LocalContext, c => c.devices);
    const isOpen = useContextSelector(PanelsContext, c => c.monitoringPanelOpen);
    const toggleLoading = useContextSelector(PanelsContext, c => c.toggleLoading);

    const [_debugData, setDebugData] = useState<AllDebugInfo>({} as AllDebugInfo);
    const [_error, setError] = useState<string | null>(null);

    const loadDebug = useCallback(async (device: Device) => {
        try {
            const data = await fetchDebug(device.satellite ? device.ip : undefined);
            setDebugData(current => {
                const debugInfo = {device: device, data: data, lastUpdated: new Date()};
                return {...current, [device.id]: debugInfo} as AllDebugInfo;
            });
            setError(null);
        } catch (err) {
            console.error('Failed to load debug info:', err);
            setError('Failed to fetch debug info');
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        console.log(new Date());

        try {
            for(const device of devices) {
                loadDebug(device);
            }
        } finally {
            toggleLoading(false);
        }

        console.log(new Date());

        const interval = setInterval(() => {
            devices.forEach(device => {
                loadDebug(device);
            });
        }, 5000);

        return () => clearInterval(interval)
    }, [isOpen, devices, loadDebug]);

    useEffect(() => {
        if (!isOpen) {
            setDebugData({} as AllDebugInfo);
            setError(null);
        }
    }, [isOpen]);

    return (
        <WrapperPanel type="monitoring">
            <div className="py-4 grid grid-cols-[20%_repeat(3,1fr)]">
                <div>&nbsp;</div>
                {devices.map(device => {
                    return (
                        <div key={device.id} className="">
                            {device.name}
                        </div>
                    );
                })}
                <div className="col-span-4 grid grid-cols-subgrid bg-slate-200 rounded-lg py-1 px-2">
                    <div className="col-span-4">MEMORY</div>
                    <div className="">Free</div>
                    <div className="">334.3 KB</div>
                    <div className="">334.3 KB</div>
                    <div className="">334.3 KB</div>
                </div>
            </div>
        </WrapperPanel>
    );
}

export default MonitoringPanel;
