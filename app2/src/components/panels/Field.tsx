import {useCallback} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../../_context";
import {Config} from "../../types.ts";
import clsx from "clsx";
import {FieldClasses, FieldSelectClasses, FieldRangeClasses, FieldAddonClasses} from "../../styles.ts";

interface SelectOption {
    value: string | number;
    label: string;
}

type Option = SelectOption | string | "-";

interface FieldProps {
    type: string;
    label: string;
    value: string | number;
    configName: keyof Config;
    mac: string;
    options?: Option[];
    addon?: string;
    [key: string]: any;
    //onChange: (key: keyof Config, value: Config[keyof Config], mac: string) => void;
}

const Field = (props: FieldProps) => {

    const {
        type,
        label,
        value,
        configName,
        mac,
        options,
        addon,
        ...rest
    } = props;

    const onConfigChange = useContextSelector(PanelsContext, c => c.onConfigChange);
    const validationErrors = useContextSelector(PanelsContext, c => c.validationErrors);

    const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
    }, []);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let rawValue: string | number = e.target.value;

        if(["hysteresis", "sensor_temperature_offset", "scale_precision"].includes(configName)){
            rawValue = Number(parseFloat(rawValue).toFixed(1));
        }
        if(["sensor_humidity_offset", "satellite_grace_period", "max_flame_duration", "led_brightness", "min_temp", "max_temp"].includes(configName)){
            rawValue = Number(parseInt(rawValue as string).toFixed(0));
        }

        if(configName === "flame_mode" && typeof rawValue === "string") {
            const flameMode = rawValue.split("_")[0];
            const flameModeSensor = rawValue.split("_")[1];
            onConfigChange("flame_mode", flameMode, mac);
            onConfigChange("flame_mode_sensor", flameModeSensor, mac);
            return;
        }
        if(configName === "max_flame_duration"){
            onConfigChange(configName, parseInt(rawValue as string) * 3600, mac);
            return;
        }
        if(configName === "led_brightness"){
            onConfigChange(configName, parseInt(rawValue as string) / 100, mac);
            return;
        }

        if(configName === "relay_enabled"){
            onConfigChange(configName, rawValue === "yes", mac);
            return;
        }

        onConfigChange(configName, rawValue, mac);
    }, [configName, mac, onConfigChange]);

    let input = (
        <input
            id={`field-${configName}-${mac}`}
            data-has-addon={addon ? "true" : undefined}
            className={clsx(FieldClasses)}
            type="text"
            value={value}
            {...rest}
            onChange={onChange}
        />
    );

    if(type === "number"){
        input = (
            <input
                id={`field-${configName}-${mac}`}
                data-has-addon={addon ? "true" : undefined}
                className={clsx(FieldClasses)}
                type="number"
                value={value}
                {...rest}
                onChange={onChange}
            />
        );
    }

    if(type === "range"){
        input = (
            <input
                id={`field-${configName}-${mac}`}
                data-has-addon={addon ? "true" : undefined}
                className={clsx(FieldRangeClasses)}
                type="range"
                value={value}
                {...rest}
                onChange={onChange}
                onTouchStart={stopPropagation}
                onTouchMove={stopPropagation}
            />
        );
    }

    if(type === "select"){
        input = (
            <select
                id={`field-${configName}-${mac}`}
                data-has-addon={addon ? "true" : undefined}
                className={clsx(FieldClasses, FieldSelectClasses)}
                value={value}
                {...rest}
                onChange={onChange}
            >
                {options?.map((option, index) => {
                    if(typeof option === "object"){
                        return <option key={`option-${configName}-${index}`} className="text-slate-500 font-light dark:text-slate-300 checked:bg-sky-500 checked:text-white hover:bg-sky-500/50" value={option.value}>{option.label}</option>;
                    } else if (option === "-") {
                        return <hr key={`option-${configName}-${index}`}/>;
                    } else {
                        return <option key={`option-${configName}-${index}`} className="text-slate-400 font-light bg-slate-200 dark:bg-slate-800" value="" disabled={true}>{option}</option>;
                    }
                })}
            </select>
        );
    }

    return (
        <div className="grid grid-cols-10">
            <label htmlFor={`field-${configName}-${mac}`} className="col-span-6 text-slate-500 flex items-center dark:text-slate-400">{label}</label>
            <div className="col-span-4 flex justify-stretch items-stretch">
                {input}
                {addon && <div className={clsx(FieldAddonClasses)}>{addon}</div>}
            </div>
            {validationErrors?.[mac]?.[configName] && <div className="col-span-10 text-red-600 dark:text-red-400 text-sm flex justify-end">{validationErrors[mac][configName]}</div>}
        </div>
    );
}

export default Field;
