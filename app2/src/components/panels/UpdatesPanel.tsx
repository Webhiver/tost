import WrapperPanel from "./WrapperPanel";
// import {useContextSelector} from "@fluentui/react-context-selector";
// import {LocalContext} from "../../_context";
import { PiUploadBold } from "react-icons/pi";

const UpdatesPanel = () => {

    //const hostMac = useContextSelector(LocalContext, c => c.hostMac);

    return (
        <WrapperPanel type="updates">
            <div className="py-4 flex flex-col justify-start items-stretch gap-4">
                <div className="bg-amber-400/50 dark:bg-amber-400/60 border border-amber-400 text-amber-700 dark:text-amber-900 p-3 rounded-lg">Do NOT power off your thermostat device during the update. It will automatically restart to complete the update.</div>
                <div className="font-light text-slate-400">INSTALLED FIRMWARE</div>
                <div className="flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-lg p-4">
                    <div className="text-slate-400">Current firmware is 1.0.20 build 230916</div>
                </div>
                <div className="font-light text-slate-400">AVAILABLE FIRMWARES</div>
                <div className="flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-lg p-4">
                    <div className="flex-1 flex justify-between items-center">
                        <h1 className="text-lg text-slate-500">1.0.22 build 2400415</h1>
                        <button className="bg-sky-500 text-white px-3 py-1 rounded-full cursor-pointer
                         hover:bg-sky-600 transition-colors">INSTALL</button>
                    </div>
                    <div className="text-sm text-slate-400">Firmware release notes are displayed here. Firmware release notes are displayed here. Firmware release notes are displayed here. Firmware release notes are displayed here. </div>
                </div>
                <div className="flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-lg p-4">
                    <div className="flex-1 flex justify-between items-center">
                        <h1 className="text-lg text-slate-500">1.0.21 build 231129</h1>
                        <button className="bg-sky-500 text-white px-3 py-1 rounded-full cursor-pointer
                         hover:bg-sky-600 transition-colors">INSTALL</button>
                    </div>
                    <div className="text-sm text-slate-400">Firmware release notes are displayed here. Firmware release notes are displayed here. Firmware release notes are displayed here. Firmware release notes are displayed here. </div>
                </div>
                <div className="font-light text-slate-400">OR MANUALLY UPLOAD FIRMWARE</div>
                <div className="border border-dashed border-slate-400 p-4 flex flex-col justify-center items-center gap-2 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
                    <PiUploadBold className="size-6 text-slate-500"/>
                    <span className="text-sm text-slate-500">Click to select firmware file</span>
                    <span className="text-xs text-slate-400">.tar.gz format</span>
                </div>
            </div>
        </WrapperPanel>
    );
}

export default UpdatesPanel;
