import {Fragment} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {GrSatellite, GrHomeRounded} from "react-icons/gr";
import Field from "./Field";
import { FaExclamationTriangle } from "react-icons/fa";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { FiSettings } from "react-icons/fi";
import {useIntl} from "react-intl";

interface SelectOption {
    value: string | number;
    label: string;
}

type Option = SelectOption | string | "-";

const SettingsPanel = () => {

    const intl = useIntl();
    const devices = useContextSelector(LocalContext, c => c.devices);
    const configs = useContextSelector(PanelsContext, c => c.configs);
    const onReboot = useContextSelector(PanelsContext, c => c.onReboot);

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

                    if(satellite) {
                        return (
                            <Fragment key={`deice-config-${mac}-${index}`}>
                                <div className="text-slate-600 bg-slate-300 rounded-md px-2 py-1 flex justify-start items-center gap-2 dark:bg-slate-500 dark:text-slate-900">
                                    <GrSatellite/>
                                    <div className="text-lg">{name}</div>
                                    <div className="flex-1"/>
                                    <div className="text-sm text-slate-400 dark:text-slate-800">{ip}</div>
                                    {online && <IoShieldCheckmarkSharp className="text-green-700 dark:text-green-500"/>}
                                    {!online && <FaExclamationTriangle className="text-red-700 dark:text-red-400"/>}
                                </div>
                                <div className="py-3 flex flex-col items-stretch justify-start gap-3">
                                    <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.operatingOptions"})}</div>
                                    <Field
                                        type={disabled ? "text" : "select"}
                                        label={intl.formatMessage({id: "settings.role"})}
                                        value={configs[mac]?.mode ?? ""}
                                        configName="mode"
                                        mac={mac}
                                        options={[{value: "host", label: intl.formatMessage({id: "settings.role.host"})}, {value: "satellite", label: intl.formatMessage({id: "settings.role.satellite"})}]}
                                        disabled={disabled}
                                    />
                                    <Field
                                        type={disabled ? "text" : "select"}
                                        label={intl.formatMessage({id: "settings.localRelayEnabled"})}
                                        value={typeof configs[mac]?.relay_enabled === "boolean" ? (configs[mac]?.relay_enabled ? "yes" : "no") : (disabled ? "" : "yes")}
                                        configName="relay_enabled"
                                        mac={mac}
                                        options={[{value: "yes", label: intl.formatMessage({id: "settings.yes"})}, {value: "no", label: intl.formatMessage({id: "settings.no"})}]}
                                        disabled={disabled}
                                    />
                                    <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.sensorCalibration"})}</div>
                                    <Field
                                        type="number"
                                        label={intl.formatMessage({id: "settings.temperatureOffset"})}
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
                                        label={intl.formatMessage({id: "settings.humidityOffset"})}
                                        value={configs[mac]?.sensor_humidity_offset ?? ""}
                                        configName="sensor_humidity_offset"
                                        mac={mac}
                                        addon="%"
                                        step="0.1"
                                        min="-10"
                                        max="10"
                                        disabled={disabled}
                                    />
                                    <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.miscellaneous"})}</div>
                                    <Field
                                        type="range"
                                        label={`${intl.formatMessage({id: "settings.ledBrightness"})} (${Math.round((configs[mac]?.led_brightness ? configs[mac].led_brightness : 0) * 100)}%)`}
                                        value={configs[mac]?.led_brightness ? configs[mac].led_brightness * 100 : 0}
                                        configName="led_brightness"
                                        mac={mac}
                                        min="0"
                                        max="100"
                                        disabled={disabled}
                                    />
                                    <div className="grid grid-cols-10">
                                        <div className="col-span-6 text-slate-500 flex items-center dark:text-slate-400">{intl.formatMessage({id: "settings.rebootDevice"})}</div>
                                        <div onClick={() => onReboot(ip)} className="col-span-4 border border-red-600/50 dark:border-red-400/80 rounded-md py-1 flex justify-center text-sm text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-600/10 dark:hover:bg-red-400/20 transition-colors">{intl.formatMessage({id: "settings.rebootNow"})}</div>
                                    </div>
                                </div>
                            </Fragment>
                        );
                    }
                    return (
                        <Fragment key={`deice-config-${mac}-${index}`}>
                            <div className="text-slate-600 bg-slate-300 rounded-md px-2 py-1 flex justify-start items-center gap-2 dark:bg-slate-500 dark:text-slate-900">
                                <FiSettings size={18}/>
                                <div className="text-lg">{intl.formatMessage({id: "settings.globalSettings"})}</div>
                                <div className="flex-1"/>
                            </div>
                            <div className="py-3 flex flex-col items-stretch justify-start gap-3">
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.temperatureControl"})}</div>
                                <Field
                                    type="select"
                                    label={intl.formatMessage({id: "settings.operatingMode"})}
                                    value={configs[mac]?.operating_mode ?? ""}
                                    configName="operating_mode"
                                    mac={mac}
                                    options={[{value: "off", label: intl.formatMessage({id: "settings.operatingMode.off"})}, {value: "manual", label: intl.formatMessage({id: "settings.operatingMode.manual"})}, {value: "schedule", label: intl.formatMessage({id: "settings.operatingMode.schedule"})}]}
                                />
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.hysteresis"})}
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
                                    label={intl.formatMessage({id: "settings.flameMode"})}
                                    value={`${configs[mac]?.flame_mode}_${configs[mac]?.flame_mode === "one" ? configs[mac]?.flame_mode_sensor : ""}`}
                                    configName="flame_mode"
                                    mac={mac}
                                    options={[
                                        intl.formatMessage({id: "settings.combinedSensors"}),
                                        {value: "average_", label: intl.formatMessage({id: "settings.combinedSensors.average"})},
                                        {value: "all_", label: intl.formatMessage({id: "settings.combinedSensors.allSensors"})},
                                        {value: "any_", label: intl.formatMessage({id: "settings.combinedSensors.anySensor"})},
                                        intl.formatMessage({id: "settings.singleSensors"}),
                                        ...singleSensors
                                    ]}
                                />
                                <Field
                                    type="select"
                                    label={intl.formatMessage({id: "settings.localSensor"})}
                                    value={configs[mac]?.local_sensor ?? ""}
                                    configName="local_sensor"
                                    mac={mac}
                                    options={[{value: "included", label: intl.formatMessage({id: "settings.localSensor.alwaysIncluded"})}, {value: "fallback", label: intl.formatMessage({id: "settings.localSensor.fallbackOnly"})}]}
                                />
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.temperatureControl"})}</div>
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.minTemperature"})}
                                    value={configs[mac]?.min_temp ?? ""}
                                    configName="min_temp"
                                    mac={mac}
                                    addon="°C"
                                    step="1"
                                    min="10"
                                    max={configs[mac]?.max_temp ?? 30}
                                />
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.maxTemperature"})}
                                    value={configs[mac]?.max_temp ?? ""}
                                    configName="max_temp"
                                    mac={mac}
                                    addon="°C"
                                    step="1"
                                    min={configs[mac]?.min_temp ?? 10}
                                    max="30"
                                />
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.scalePrecision"})}
                                    value={configs[mac]?.scale_precision ?? ""}
                                    configName="scale_precision"
                                    mac={mac}
                                    addon="°C"
                                    step="0.1"
                                    min="0.1"
                                    max="1"
                                />
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.timing"})}</div>
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.satelliteGracePeriod"})}
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
                                    label={intl.formatMessage({id: "settings.maxFlameDuration"})}
                                    value={configs[mac]?.max_flame_duration ? Math.round(configs[mac].max_flame_duration / 3600) : ""}
                                    configName="max_flame_duration"
                                    mac={mac}
                                    addon="hours"
                                    step="1"
                                    min="1"
                                    max="24"
                                />
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.flameCooldown"})}
                                    value={configs[mac]?.flame_cooldown ? Math.round(configs[mac].flame_cooldown / 60) : ""}
                                    configName="flame_cooldown"
                                    mac={mac}
                                    addon={intl.formatMessage({id: "settings.minutes"})}
                                    step="1"
                                    min="5"
                                    max="60"
                                />
                            </div>


                            <div className="text-slate-600 bg-slate-300 rounded-md px-2 py-1 flex justify-start items-center gap-2 dark:bg-slate-500 dark:text-slate-900">
                                <GrHomeRounded/>
                                <div className="text-lg">{name}</div>
                                <div className="flex-1"/>
                                <div className="text-sm text-slate-400 dark:text-slate-800">{ip}</div>
                                {online && <IoShieldCheckmarkSharp className="text-green-700 dark:text-green-500"/>}
                                {!online && <FaExclamationTriangle className="text-red-700 dark:text-red-400"/>}
                            </div>
                            <div className="py-3 flex flex-col items-stretch justify-start gap-3">
                                {/*<Field*/}
                                {/*    type="text"*/}
                                {/*    label="Device Name"*/}
                                {/*    value={configs[mac]?.name ?? ""}*/}
                                {/*    configName="name"*/}
                                {/*    mac={mac}*/}
                                {/*/>*/}
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.operatingOptions"})}</div>
                                <Field
                                    type="select"
                                    label={intl.formatMessage({id: "settings.role"})}
                                    value={configs[mac]?.mode ?? ""}
                                    configName="mode"
                                    mac={mac}
                                    options={[{value: "host", label: intl.formatMessage({id: "settings.role.host"})}, {value: "satellite", label: intl.formatMessage({id: "settings.role.satellite"})}]}
                                />
                                <Field
                                    type="select"
                                    label={intl.formatMessage({id: "settings.localRelayEnabled"})}
                                    value={typeof configs[mac]?.relay_enabled === "boolean" ? (configs[mac]?.relay_enabled ? "yes" : "no") : (disabled ? "" : "yes")}
                                    configName="relay_enabled"
                                    mac={mac}
                                    options={[{value: "yes", label: intl.formatMessage({id: "settings.yes"})}, {value: "no", label: intl.formatMessage({id: "settings.no"})}]}
                                    disabled={true}
                                />
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.sensorCalibration"})}</div>
                                <Field
                                    type="number"
                                    label={intl.formatMessage({id: "settings.temperatureOffset"})}
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
                                    label={intl.formatMessage({id: "settings.humidityOffset"})}
                                    value={configs[mac]?.sensor_humidity_offset ?? ""}
                                    configName="sensor_humidity_offset"
                                    mac={mac}
                                    addon="%"
                                    step="1"
                                    min="-20"
                                    max="20"
                                />
                                <div className="font-light text-slate-400 dark:text-slate-500">{intl.formatMessage({id: "settings.section.miscellaneous"})}</div>
                                <Field
                                    type="range"
                                    label={`${intl.formatMessage({id: "settings.ledBrightness"})} (${Math.round((configs[mac]?.led_brightness ? configs[mac].led_brightness : 0) * 100)}%)`}
                                    value={configs[mac]?.led_brightness ? configs[mac].led_brightness * 100 : 0}
                                    configName="led_brightness"
                                    mac={mac}
                                    min="0"
                                    max="100"
                                />
                                <div className="grid grid-cols-10">
                                    <div className="col-span-6 text-slate-500 flex items-center dark:text-slate-400">{intl.formatMessage({id: "settings.rebootDevice"})}</div>
                                    <div onClick={() => onReboot()} className="col-span-4 border border-red-600/50 dark:border-red-400/80 rounded-md py-1 flex justify-center text-sm text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-600/10 dark:hover:bg-red-400/20 transition-colors">{intl.formatMessage({id: "settings.rebootNow"})}</div>
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </WrapperPanel>
    );
}

export default SettingsPanel;
