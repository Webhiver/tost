import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {PanelsContext} from "../../_context";

const SettingsPanel = () => {

    const configs = useContextSelector(PanelsContext, c => c.configs);
    const onConfigChange = useContextSelector(PanelsContext, c => c.onConfigChange);

    return (
        <WrapperPanel type="settings">
            <div className="grid grid-cols-10">
                <div className="col-span-6">Name:</div>
                <div className="col-span-4">
                    <input
                        type="text"
                        value={configs["2c:cf:67:bb:fe:78"]?.name || ""}
                        className="w-full border border-slate-300 rounded-md px-2 py-1"
                        onChange={e => onConfigChange("name", e.target.value, "2c:cf:67:bb:fe:78")}
                    />
                </div>
            </div>
        </WrapperPanel>
    );
}

export default SettingsPanel;
