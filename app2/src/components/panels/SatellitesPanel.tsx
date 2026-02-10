import {Fragment, useCallback} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../../_context";
import {SatelliteConfig} from "../../types.ts";
import SatelliteField from "./SatelliteField";
import { FaExclamationTriangle } from "react-icons/fa";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import {isValidMac} from "../../utils.ts";

const SatellitesPanel = () => {

    const hostMac = useContextSelector(LocalContext, c => c.hostMac);
    const devices = useContextSelector(LocalContext, c => c.devices);
    const configs = useContextSelector(PanelsContext, c => c.configs);

    const onAddSatellite = useContextSelector(PanelsContext, c => c.onAddSatellite);
    const onRemoveSatellite = useContextSelector(PanelsContext, c => c.onRemoveSatellite);

    const getSatelliteIpByMac = useCallback((mac: string) => {
        const device = devices.find(device => device.id === mac) || null;

        if(device) {
            return (
                <Fragment>
                    <a className="underline" target="_blank" href={`http://${device.ip}`}>{device.ip}</a>
                    {device.online && <IoShieldCheckmarkSharp className="text-green-700 dark:text-green-500"/>}
                    {!device.online && <FaExclamationTriangle className="text-red-700 dark:text-red-500"/>}
                </Fragment>
            );
        }
        return "not assigned";
    }, [devices]);

    return (
        <WrapperPanel type="satellites">
            <div className="py-4 flex flex-col justify-start items-stretch gap-4">
                {configs[hostMac]?.satellites.map((satellite: SatelliteConfig, index: number) => {
                    const macValid = isValidMac(satellite.mac);
                    const showError = satellite.mac.length > 0 && !macValid;

                    return (
                        <div className="flex-1 flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-md p-4" key={`satellite-${index}-${satellite.mac}`}>
                            <SatelliteField
                                index={index}
                                label="Satellite Name"
                                value={satellite.name || ""}
                                configName="name"
                                placeholder="Living"
                            />
                            <SatelliteField
                                index={index}
                                label="Satellite Mac"
                                value={satellite.mac || ""}
                                configName="mac"
                                placeholder="aa:bb:cc:dd:ee:ff"
                                invalid={showError ? "Invalid MAC address" : false}
                            />
                            <div className="grid grid-cols-10">
                                <div className="col-span-6 text-slate-400 text-sm flex items-center gap-1">Satellite IP: {getSatelliteIpByMac(satellite.mac)}</div>
                                <div onClick={() => onRemoveSatellite(index)} className="col-span-4 border border-red-600/50 dark:border-red-400/80 rounded-md py-1 flex justify-center text-sm text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-600/10 dark:hover:bg-red-400/20 transition-colors">Remove satellite</div>
                            </div>
                        </div>
                    );
                })}
                <div onClick={onAddSatellite} className="flex-1 flex flex-col items-center justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-md p-4 text-slate-500 dark:text-slate-400 cursor-pointer hover:border-slate-500 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    Add new satellite
                </div>
            </div>
        </WrapperPanel>
    );
}

export default SatellitesPanel;
