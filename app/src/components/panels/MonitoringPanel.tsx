import {useEffect, useState, useCallback, useRef, Fragment} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {AllDebugInfo} from "../../types.ts";
import {fetchAllDebug} from "../../api.ts";
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
    const value = props.path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
    if (props.type === 'progress' || props.type === 'number') {
        return value != null ? Number(value) : 0;
    }
    return value ?? null;
}

const MonitoringPanel = () => {

    const structure = useRef<StructureSection[]>([
        {
            titleId: 'monitoring.section.memory',
            props: [{
                titleId: 'monitoring.free',
                path: 'data.memory.free_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.used',
                path: 'data.memory.percent_used',
                suffix: '%',
                type: 'number',
            }, {
                titleId: null,
                path: 'data.memory.percent_used',
                suffix: null,
                type: 'progress',
            }],
        }, {
            titleId: 'monitoring.section.cpu',
            props: [{
                titleId: 'monitoring.frequency',
                path: 'data.cpu.frequency_mhz',
                suffix: 'MHz',
                type: 'number',
            }, {
                titleId: 'monitoring.internalTemp',
                path: 'data.internal_temp_c',
                suffix: '°C',
                type: 'number',
            }],
        }, {
            titleId: 'monitoring.section.flash',
            props: [{
                titleId: 'monitoring.total',
                path: 'data.flash.total_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.free',
                path: 'data.flash.free_kb',
                suffix: 'KB',
                type: 'number',
            }, {
                titleId: 'monitoring.used',
                path: 'data.flash.percent_used',
                suffix: '%',
                type: 'number',
            }, {
                titleId: null,
                path: 'data.flash.percent_used',
                suffix: null,
                type: 'progress',
            }],
        }, {
            titleId: 'monitoring.section.network',
            props: [{
                titleId: 'monitoring.ip',
                path: 'data.network.ip',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.gateway',
                path: 'data.network.gateway',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.dns',
                path: 'data.network.dns',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.rssi',
                path: 'data.network.rssi',
                suffix: 'dBm',
                type: 'number',
            }],
        }, {
            titleId: 'monitoring.section.system',
            props: [{
                titleId: 'monitoring.machine',
                path: 'data.system.machine',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.release',
                path: 'data.system.release',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.firmware',
                path: 'device.firmwareVersion',
                suffix: null,
                type: 'text',
            }, {
                titleId: 'monitoring.uptime',
                path: 'data.uptime.formatted',
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

    const loadDebug = useCallback(async () => {
        try {
            const data = await fetchAllDebug();
            const debugData: AllDebugInfo = {};
            for (const device of devices) {
                debugData[device.id] = {
                    device: device,
                    data: data[device.id],
                    lastUpdates: new Date(),
                };
            }
            setDebugData(debugData as AllDebugInfo);
            setError(null);
        } catch (err) {
            console.error('Failed to load debug info:', err);
            setError('Failed to fetch debug info');
        }
    }, [devices]);

    useEffect(() => {
        if (!isOpen) return;

        try {
            loadDebug();
        } finally {
            toggleLoading(false);
        }

        const interval = setInterval(() => {
            loadDebug();
        }, 5000);

        return () => clearInterval(interval)
    }, [isOpen, devices, loadDebug]);

    useEffect(() => {
        if (!isOpen) {
            setDebugData({} as AllDebugInfo);
            setError(null);
        }
    }, [isOpen]);

    const gridStyle = {
        gridTemplateColumns: `25% repeat(${devices.length}, minmax(80px, 1fr))`,
    };

    return (
        <WrapperPanel type="monitoring" contentClasses="overflow-x-auto">
            <div className="py-4 grid gap-y-1 gap-x-2 text-sm text-slate-500 dark:text-slate-500" style={gridStyle}>
                <div className="">&nbsp;</div>
                {devices.map((device, index) => {
                    return (
                        <div key={`device-${index}`} className="text-right text-base font-normal">{device.name}</div>
                    );
                })}
                {structure.current.map((section, sectionIndex) => {
                    return (
                        <Fragment key={sectionIndex}>
                            <div className="col-span-full grid grid-cols-subgrid bg-black/5 py-1 px-2 whitespace-nowrap">{intl.formatMessage({id: section.titleId})}</div>
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
                                                            style={{width: `${getNestedValue(debugData[device.id], prop)}%`}}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={`${sectionIndex}-${propIndex}-${deviceIndex}`} className="text-right">{getNestedValue(debugData[device.id], prop)}{prop.suffix}</div>
                                            );
                                        })}
                                    </Fragment>
                                );
                            })}
                            <div key={`${sectionIndex}-blank`} className="col-span-full h-3">&nbsp;</div>
                        </Fragment>
                    );
                })}
            </div>
        </WrapperPanel>
    );
}

export default MonitoringPanel;
