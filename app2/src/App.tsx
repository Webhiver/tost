import {useContextSelector} from "@fluentui/react-context-selector";
import Header from "./components/Header";
import Modes from "./components/Modes";
import Controller from "./components/Controller";
import Satellites from "./components/Satellites";
import SatelliteMode from "./components/SatelliteMode";
import PairingMode from "./components/PairingMode";
import {ApiContext, LocalContext} from "./_context";
import {Fragment} from "react";
import MainPanel from "./components/panels/MainPanel";
import SettingsPanel from "./components/panels/SettingsPanel";
import SatellitesPanel from "./components/panels/SatellitesPanel";
import MonitoringPanel from "./components/panels/MonitoringPanel";
import UpdatesPanel from "./components/panels/UpdatesPanel";
import {IntlProvider, FormattedMessage} from "react-intl";
import en from "../translations/en.json";
import ro from "../translations/ro.json";

const messages = {en, ro};

const App = () => {
    const language = useContextSelector(LocalContext, c => c.language)

    return (
        <IntlProvider locale={language} messages={messages[language]}>
            <AppContent/>
        </IntlProvider>
    );
}

const AppContent = () => {
    const isLoading = useContextSelector(ApiContext, c => c.isLoading)
    const type = useContextSelector(LocalContext, c => c.type)
    const isPairing = useContextSelector(LocalContext, c => c.isPairing)

    if(isLoading) {
        return (
            <div className="flex-1 inset-0 bg-linear-to-b from-white to-slate-100 flex justify-center items-center">
                <FormattedMessage id="app.loading"/>
            </div>
        );
    }

    if (isPairing) {
        return (
            <Fragment>
                <Header/>
                <PairingMode/>
            </Fragment>
        )
    }

    if(type === "satellite") {
        return (
            <Fragment>
                <Header/>
                <Modes/>
                <SatelliteMode/>
                <UpdatesPanel/>
            </Fragment>
        );
    }

    return (
        <Fragment>
            <Header/>
            <Modes/>
            <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:from-slate-950 dark:to-slate-800 dark:shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                <Controller/>
                <Satellites/>
            </div>
            <MainPanel/>
            <SettingsPanel/>
            <SatellitesPanel/>
            <MonitoringPanel/>
            <UpdatesPanel/>
        </Fragment>
    );
}

export default App
