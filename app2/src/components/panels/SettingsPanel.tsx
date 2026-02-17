import {Fragment} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {} from "../../types.ts";
import {GrSatellite, GrHomeRounded} from "react-icons/gr";
import Field from "./Field";
import { FaExclamationTriangle } from "react-icons/fa";
import { IoShieldCheckmarkSharp } from "react-icons/io5";

interface SelectOption {
    value: string | number;
    label: string;
}

type Option = SelectOption | string | "-";

const SettingsPanel = () => {

    const devices = useContextSelector(LocalContext, c => c.devices);
    const configs = useContextSelector(PanelsContext, c => c.configs);

    const singleSensors: Option[] = [];
    devices.forEach(device => {
        singleSensors.push({value: `one_${device.id}`, label: device.name});
    });

    return (
        <WrapperPanel type="settings">
            <div className="py-4">
                {devices.map((device, index) => {
                    const mac = device.id;
                    const ip = device.ip;
                    const satellite = device.satellite;
                    const name = device.name;
                    const online = device.online;
                    const noConfig = !configs[mac] || configs[mac] === undefined;
                    const disabled = satellite && (!online || !ip || noConfig);

                    return (
                        <Fragment key={`deice-config-${mac}-${index}`}>
                            <div className="text-slate-600 bg-slate-300 rounded-md px-2 py-1 flex justify-start items-center gap-2 dark:bg-slate-500 dark:text-slate-900">
                                {!satellite ? <GrHomeRounded/> : <GrSatellite/>}
                                <div className="text-lg">{name}</div>
                                <div className="flex-1"/>
                                <div className="text-sm text-slate-400 dark:text-slate-800">{satellite ? ip : "this device"}</div>
                                {satellite && online && <IoShieldCheckmarkSharp className="text-green-700 dark:text-green-500"/>}
                                {satellite && !online && <FaExclamationTriangle className="text-red-700 dark:text-red-400"/>}
                            </div>
                            <div className="py-3 flex flex-col items-stretch justify-start gap-3">
                                {!satellite &&
                                    <>
                                        <Field
                                            type="text"
                                            label="Device Name"
                                            value={configs[mac]?.name ?? ""}
                                            configName="name"
                                            mac={mac}
                                        />
                                        <Field
                                            type="select"
                                            label="Role"
                                            value={configs[mac]?.mode ?? ""}
                                            configName="mode"
                                            mac={mac}
                                            options={[{value: "host", label: "Host"}, {value: "satellite", label: "Satellite"}]}
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">TEMPERATURE CONTROL</div>
                                        <Field
                                            type="select"
                                            label="Operating Mode"
                                            value={configs[mac]?.operating_mode ?? ""}
                                            configName="operating_mode"
                                            mac={mac}
                                            options={[{value: "off", label: "Off"}, {value: "manual", label: "Manual"}, {value: "schedule", label: "Schedule"}]}
                                        />
                                        <Field
                                            type="number"
                                            label="Hysteresis"
                                            value={configs[mac]?.hysteresis ?? ""}
                                            configName="hysteresis"
                                            mac={mac}
                                            addon="°C"
                                            step="0.1"
                                            min="0.1"
                                            max="5"
                                        />
                                        <Field
                                            type="select"
                                            label="Flame Mode"
                                            value={`${configs[mac]?.flame_mode}_${configs[mac]?.flame_mode === "one" ? configs[mac]?.flame_mode_sensor : ""}`}
                                            configName="flame_mode"
                                            mac={mac}
                                            options={[
                                                "Combined Sensors",
                                                {value: "average_", label: "Average"},
                                                {value: "all_", label: "All Sensors"},
                                                {value: "any_", label: "Any Sensor"},
                                                "Single Sensors",
                                                ...singleSensors
                                            ]}
                                        />
                                        <Field
                                            type="select"
                                            label="Local Sensor"
                                            value={configs[mac]?.local_sensor ?? ""}
                                            configName="local_sensor"
                                            mac={mac}
                                            options={[{value: "included", label: "Always Included"}, {value: "fallback", label: "Fallback Only"}]}
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">SENSOR CALIBRATION</div>
                                        <Field
                                            type="number"
                                            label="Temperature Offset"
                                            value={configs[mac]?.sensor_temperature_offset ?? ""}
                                            configName="sensor_temperature_offset"
                                            mac={mac}
                                            addon="°C"
                                            step="0.1"
                                            min="-10"
                                            max="10"
                                        />
                                        <Field
                                            type="number"
                                            label="Humidity Offset"
                                            value={configs[mac]?.sensor_humidity_offset ?? ""}
                                            configName="sensor_humidity_offset"
                                            mac={mac}
                                            addon="%"
                                            step="1"
                                            min="-20"
                                            max="20"
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">TIMING</div>
                                        <Field
                                            type="number"
                                            label="Satellite Grace Period"
                                            value={configs[mac]?.satellite_grace_period ?? ""}
                                            configName="satellite_grace_period"
                                            mac={mac}
                                            addon="sec"
                                            step="10"
                                            min="10"
                                            max="600"
                                        />
                                        <Field
                                            type="number"
                                            label="Max Flame Duration"
                                            value={configs[mac]?.max_flame_duration ? Math.round(configs[mac].max_flame_duration / 3600) : ""}
                                            configName="max_flame_duration"
                                            mac={mac}
                                            addon="hours"
                                            step="1"
                                            min="1"
                                            max="24"
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">MISCELLANEOUS</div>
                                        <Field
                                            type="range"
                                            label={`LED Brightness (${Math.round((configs[mac]?.led_brightness ? configs[mac].led_brightness : 0) * 100)}%)`}
                                            value={configs[mac]?.led_brightness ? configs[mac].led_brightness * 100 : 0}
                                            configName="led_brightness"
                                            mac={mac}
                                            min="0"
                                            max="100"
                                        />
                                    </>
                                }
                                {satellite &&
                                    <>
                                        <div className="font-light text-slate-400 dark:text-slate-500">OPERATING OPTIONS</div>
                                        <Field
                                            type={disabled ? "text" : "select"}
                                            label="Role"
                                            value={configs[mac]?.mode ?? ""}
                                            configName="mode"
                                            mac={mac}
                                            options={[{value: "host", label: "Host"}, {value: "satellite", label: "Satellite"}]}
                                            disabled={disabled}
                                        />
                                        <Field
                                            type={disabled ? "text" : "select"}
                                            label="Local Relay Enabled"
                                            value={typeof configs[mac]?.relay_enabled === "boolean" ? (configs[mac]?.relay_enabled ? "yes" : "no") : "yes"}
                                            configName="relay_enabled"
                                            mac={mac}
                                            options={[{value: "yes", label: "YES"}, {value: "no", label: "NO"}]}
                                            disabled={disabled}
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">SENSOR CALIBRATION</div>
                                        <Field
                                            type="number"
                                            label="Temperature Offset"
                                            value={configs[mac]?.sensor_temperature_offset ?? ""}
                                            configName="sensor_temperature_offset"
                                            mac={mac}
                                            addon="°C"
                                            step="0.1"
                                            min="-10"
                                            max="10"
                                            disabled={disabled}
                                        />
                                        <Field
                                            type="number"
                                            label="Humidity Offset"
                                            value={configs[mac]?.sensor_humidity_offset ?? ""}
                                            configName="sensor_humidity_offset"
                                            mac={mac}
                                            addon="%"
                                            step="0.1"
                                            min="-10"
                                            max="10"
                                            disabled={disabled}
                                        />
                                        <div className="font-light text-slate-400 dark:text-slate-500">MISCELLANEOUS</div>
                                        <Field
                                            type="range"
                                            label={`LED Brightness (${Math.round((configs[mac]?.led_brightness ? configs[mac].led_brightness : 0) * 100)}%)`}
                                            value={configs[mac]?.led_brightness ? configs[mac].led_brightness * 100 : 0}
                                            configName="led_brightness"
                                            mac={mac}
                                            min="0"
                                            max="100"
                                            disabled={disabled}
                                        />
                                    </>}
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </WrapperPanel>
    );
}

export default SettingsPanel;
