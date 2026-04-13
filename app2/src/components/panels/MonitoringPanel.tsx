import {useEffect, useState, useCallback, useRef, Fragment} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {Device, AllDebugInfo} from "../../types.ts";
import {fetchDebug} from "../../api.ts";
import {useIntl} from "react-intl";

interface StructureProp {
    titleId: string | null;
    path: string;
    suffix: string | null;
    type: 'number' | 'text' | 'progress';
}

interface StructureSection {
    titleId: string;
    props: StructureProp[];
}

const getNestedValue = (obj: any, props: StructureProp): any => {
    let value = props.path.split('.').reduce((acc, key) => acc?.[key], obj);
    if(props.type === 'progress' || props.type === 'number') {
        return value ? Number(value) : 0;
    }
    return value ? value : null;
}

const MonitoringPanel = () => {

    const structure = useRef<StructureSection[]>([
        {
            titleId: 'monitoring.section.memory',
            props: [{
                titleId: 'monitoring.free',
                path: 'memory.free_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.used',
                path: 'memory.percent_used',
                suffix: '%',
                type: 'number',
            }, {
                titleId: null,
                path: 'memory.percent_used',
                suffix: null,
                type: 'progress',
            }],
        }, {
            titleId: 'monitoring.section.cpu',
            props: [{
                titleId: 'monitoring.frequency',
                path: 'cpu.frequency_mhz',
                suffix: 'MHz',
                type: 'number',
            }, {
                titleId: 'monitoring.internalTemp',
                path: 'internal_temp_c',
                suffix: '°C',
                type: 'number',
            }],
        }, {
            titleId: 'monitoring.section.flash',
            props: [{
                titleId: 'monitoring.total',
                path: 'flash.total_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.free',
                path: 'flash.free_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.used',
                path: 'flash.percent_used',
                suffix: '%',
                type: 'number',
            }, {
                titleId: null,
                path: 'flash.percent_used',
                suffix: null,
                type: 'progress',
            }],
        }, {
            titleId: 'monitoring.section.network',
            props: [{
                titleId: 'monitoring.ip',
                path: 'network.ip',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.gateway',
                path: 'network.gateway',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.dns',
                path: 'network.dns',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.rssi',
                path: 'network.rssi',
                suffix: 'dBm',
                type: 'number',
            }],
        }, {
            titleId: 'monitoring.section.system',
            props: [{
                titleId: 'monitoring.machine',
                path: 'system.machine',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.release',
                path: 'system.release',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.uptime',
                path: 'uptime.formatted',
                suffix: null,
                type: 'text',
            }],
        }
    ]);

    const intl = useIntl();
    const devices = useContextSelector(LocalContext, c => c.devices);
    const isOpen = useContextSelector(PanelsContext, c => c.monitoringPanelOpen);
    const toggleLoading = useContextSelector(PanelsContext, c => c.toggleLoading);

    const [debugData, setDebugData] = useState<AllDebugInfo>({} as AllDebugInfo);
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

        try {
            for(const device of devices) {
                loadDebug(device);
            }
        } finally {
            toggleLoading(false);
        }

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
            <div className="py-4 grid grid-cols-[25%_repeat(3,1fr)] gap-y-1 gap-x-2 text-sm text-slate-500 dark:text-slate-500">
                <div className="">&nbsp;</div>
                {devices.map((device, index) => {
                    return (
                        <div key={`device-${index}`} className="text-right text-base font-normal">{device.name}</div>
                    );
                })}
                {structure.current.map((section, sectionIndex) => {
                    return (
                        <Fragment key={sectionIndex}>
                            <div className="col-span-4 grid grid-cols-subgrid bg-black/5 py-1 px-2 whitespace-nowrap">{intl.formatMessage({id: section.titleId})}</div>
                            {section.props.map((prop, propIndex) => {
                                return (
                                    <Fragment key={`${sectionIndex}-${propIndex}`}>
                                        <div className="">{prop.titleId ? intl.formatMessage({id: prop.titleId}) : null}</div>
                                        {devices.map((device, deviceIndex) => {
                                            if(prop.type === 'progress') {
                                                return (
                                                    <div key={`${sectionIndex}-${propIndex}-${deviceIndex}`} className="bg-slate-300 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-orange-400 rounded-full"
                                                            style={{width: `${getNestedValue(debugData[device.id]?.data, prop)}%`}}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={`${sectionIndex}-${propIndex}-${deviceIndex}`} className="text-right">{getNestedValue(debugData[device.id]?.data, prop)}{prop.suffix}</div>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })}
                            <div key={`${sectionIndex}-blank`} className="col-span-4 h-3">&nbsp;</div>
                        </Fragment>
                    );
                })}
            </div>
        </WrapperPanel>
    );
}

export default MonitoringPanel;
