import LocalProvider from './_providers/LocalProvider'
import ApiProvider from './_providers/ApiProvider'
import PanelsProvider from './_providers/PanelsProvider'
import App from './App.tsx'
import MainPanel from "./components/panels/MainPanel";
import SettingsPanel from "./components/panels/SettingsPanel";
import SatellitesPanel from "./components/panels/SatellitesPanel";
import UpdatesPanel from "./components/panels/UpdatesPanel";

const Layout = () => {

    // Host mode (default)
    return (
        <div className="w-screen h-screen bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-800 w-screen h-screen lg:w-104 lg:h-auto lg:min-h-200 lg:rounded-3xl lg:shadow-xl flex flex-col justify-stretch">
                <ApiProvider>
                    <LocalProvider>
                        <PanelsProvider>
                            <App/>
                            <MainPanel/>
                            <SettingsPanel/>
                            <SatellitesPanel/>
                            <UpdatesPanel/>
                        </PanelsProvider>
                    </LocalProvider>
                </ApiProvider>
            </div>
        </div>
    )
}

export default Layout
