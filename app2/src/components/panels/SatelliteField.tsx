import {useCallback} from "react";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../../_context";
import {SatelliteConfig} from "../../types.ts";
import {FieldClasses} from "../../styles.ts";
import clsx from "clsx";

interface FieldProps {
    index: number;
    label: string;
    value: string | number;
    configName: keyof SatelliteConfig;
    invalid?: string | boolean;
    [key: string]: any;
}

const SatelliteField = (props: FieldProps) => {

    const {
        index,
        label,
        value,
        configName,
        invalid = false,
        ...rest
    } = props;

    const onSatelliteConfigChange = useContextSelector(PanelsContext, c => c.onSatelliteConfigChange);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onSatelliteConfigChange(index, configName, e.target.value);
    }, [configName, onSatelliteConfigChange]);

    return (
        <div className="grid grid-cols-10">
            <label htmlFor={`satellite-field-${configName}-${index}`} className="col-span-6 text-slate-500 flex items-center">{label}</label>
            <div className="col-span-4 flex justify-stretch items-stretch">
                <input
                    id={`satellite-field-${configName}-${index}`}
                    className={clsx(FieldClasses)}
                    type="text"
                    value={value}
                    data-invalid={invalid ? "true" : undefined}
                    {...rest}
                    onChange={onChange}
                />
            </div>
            {invalid && <div className="col-span-10 text-red-600 text-sm flex justify-end">{invalid}</div>}
        </div>
    );
}

export default SatelliteField;
