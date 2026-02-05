import WrapperPanel from "./WrapperPanel";
import { TbSettings } from "react-icons/tb";
import {PiHandSwipeRight} from "react-icons/pi";

const SettingsPanel = () => {

    return (
        <WrapperPanel type="settings">
            <div className="flex justify-start items-center gap-2 px-6 py-4 text-slate-500 text-xl border-b border-slate-300">
                <TbSettings className="size-6"/>
                SETTINGS
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
                CONTENT
            </div>
            <div className="pb-2 text-sm text-slate-500 flex justify-center items-center gap-2 "><PiHandSwipeRight/>Swipe right to go back</div>
        </WrapperPanel>
    );
}

export default SettingsPanel;
