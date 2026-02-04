import {ReactNode, useState, useRef, useCallback} from "react";
import {PanelsContext} from "../_context";
import {PanelType} from "../types.ts";

const PanelsProvider = ({children}: { children: ReactNode }) => {
    const panelsAnimationSpeed = useRef<number>(300);
    const [mainPanelOpen, setMainPanelOpen] = useState<boolean>(false);
    const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false);
    const [satellitesPanelOpen, setSatellitesPanelOpen] = useState<boolean>(false);
    const [statisticsPanelOpen, setStatisticsPanelOpen] = useState<boolean>(false);
    const [monitoringPanelOpen, setMonitoringPanelOpen] = useState<boolean>(false);
    const [updatesPanelOpen, setUpdatesPanelOpen] = useState<boolean>(false);

    const togglePanel = useCallback((panel: PanelType, isOpen?: boolean | undefined) => {
        switch (panel) {
            case "main":
                setMainPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            case "settings":
                setSettingsPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            case "satellites":
                setSatellitesPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            case "statistics":
                setStatisticsPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            case "monitoring":
                setMonitoringPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            case "updates":
                setUpdatesPanelOpen(current => isOpen !== undefined ? isOpen : !current);
                break;
            default:
                break;
        }
    }, []);

    return (
        <PanelsContext.Provider value={{
            panelsAnimationSpeed: panelsAnimationSpeed.current,
            mainPanelOpen,
            settingsPanelOpen,
            satellitesPanelOpen,
            statisticsPanelOpen,
            monitoringPanelOpen,
            updatesPanelOpen,
            togglePanel,
        }}>
            {children}
        </PanelsContext.Provider>
    )
}

export default PanelsProvider;