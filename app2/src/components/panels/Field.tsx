import {useCallback} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../../_context";
import {Config} from "../../types.ts";

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

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if(configName === "flame_mode") {
            const flameMode = e.target.value.split("_")[0];
            const flameModeSensor = e.target.value.split("_")[1];
            onConfigChange("flame_mode", flameMode, mac);
            onConfigChange("flame_mode_sensor", flameModeSensor, mac);
            return;
        }
        if(configName === "sensor_temperature_offset"){
            onConfigChange(configName, parseInt(e.target.value) * 3600, mac);
            return;
        }
        if(configName === "led_brightness"){
            onConfigChange(configName, parseInt(e.target.value) / 100, mac);
            return;
        }
        onConfigChange(configName, e.target.value, mac);
    }, [configName, mac, onConfigChange]);

    let input = (
        <input
            data-has-addon={addon ? "true" : undefined}
            className="w-full flex-1 border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-500 data-has-addon:rounded-r-none"
            type="text"
            value={value}
            {...rest}
            onChange={onChange}
        />
    );

    if(type === "number"){
        input = (
            <input
                data-has-addon={addon ? "true" : undefined}
                className="w-full flex-1 border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-500 data-has-addon:rounded-r-none"
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
                data-has-addon={addon ? "true" : undefined}
                className="w-full bg-white text-slate-500"
                type="range"
                value={value}
                {...rest}
                onChange={onChange}
            />
        );
    }

    if(type === "select"){
        input = (
            <select
                data-has-addon={addon ? "true" : undefined}
                className="w-full flex-1 border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-500 data-has-addon:rounded-r-none"
                value={value}
                {...rest}
                onChange={onChange}
            >
                {options?.map((option, index) => {
                    if(typeof option === "object"){
                        return <option key={`option-${configName}-${index}`} className="text-slate-500 font-light" value={option.value}>{option.label}</option>;
                    } else if (option === "-") {
                        return <hr key={`option-${configName}-${index}`}/>;
                    } else {
                        return <option key={`option-${configName}-${index}`} className="text-slate-400 font-light bg-slate-200" value="" disabled={true}>{option}</option>;
                    }
                })}
            </select>
        );
    }

    return (
        <div className="grid grid-cols-10">
            <div className="col-span-6 text-slate-500 flex items-center">{label}</div>
            <div className="col-span-4 flex justify-stretch items-stretch">
                {input}
                {addon && <div className="flex items-center bg-slate-300 text-sm font-medium text-slate-500 px-2 rounded-r-md">{addon}</div>}
            </div>
        </div>
    );
}

export default Field;
