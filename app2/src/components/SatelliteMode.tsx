import {GrSatellite} from "react-icons/gr";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../_context";
import {useIntl} from "react-intl";

const SatelliteMode = () => {

    const intl = useIntl();
    const healthy = useContextSelector(LocalContext, c => c.healthy)
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp)
    const temperature = useContextSelector(LocalContext, c => c.temperature)
    const humidity = useContextSelector(LocalContext, c => c.humidity)

    return (
        <div className="p-6 flex-1 flex flex-col items-center gap-6 justify-start overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:from-slate-950 dark:to-slate-800 dark:shadow-[0_0_10px_rgba(0,0,0,0.8)]">
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="bg-linear-to-r from-blue-100 dark:from-blue-800 to-transparent border border-blue-300 dark:border-blue-500 rounded-full text-blue-400 dark:text-blue-400 px-3 py-1 text-sm font-medium flex justify-start items-center gap-2">
                    <GrSatellite/>
                    {intl.formatMessage({id: "satelliteMode.title"})}
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">{intl.formatMessage({id: "satelliteMode.targetTemperature"})}</div>
                    <div className="text-4xl font-mono text-slate-400 dark:text-slate-300">{targetTemp?.toFixed(1) ?? "--"}°C
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">{intl.formatMessage({id: "satelliteMode.localTemperature"})}</div>
                    <div className="text-4xl font-mono text-slate-400 dark:text-slate-300">{temperature?.toFixed(1) ?? "--"}°C
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">{intl.formatMessage({id: "satelliteMode.localHumidity"})}</div>
                    <div className="text-4xl font-mono text-slate-400 dark:text-slate-300">{humidity?.toFixed(1) ?? "--"}%
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                    {healthy && <div className="bg-linear-to-r from-emerald-100 dark:from-emerald-800 to-transparent border border-emerald-300 dark:border-emerald-500 rounded-full text-emerald-400 dark:text-emerald-400 px-3 py-1 text-sm font-medium">{intl.formatMessage({id: "satelliteMode.sensorHealthy"})}</div>}
                    {!healthy && <div className="bg-linear-to-r from-amber-100 dark:from-amber-800 to-transparent border border-amber-300 dark:border-amber-500 rounded-full text-amber-400 dark:text-amber-400 px-3 py-1 text-sm font-medium">{intl.formatMessage({id: "satelliteMode.sensorBroken"})}</div>}
                </div>
            </div>
            <div className="bg-slate-200 dark:bg-slate-700 p-4 rounded-lg text-slate-600 dark:text-slate-300">
                {intl.formatMessage({id: "satelliteMode.description"}, {br: <br/>})}
            </div>
        </div>
    );
}

export default SatelliteMode;