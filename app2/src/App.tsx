import {useContextSelector} from "@fluentui/react-context-selector";
import Header from "./components/Header";
import Modes from "./components/Modes";
import Controller from "./components/Controller";
import Satellites from "./components/Satellites";
import {ApiContext} from "./_context";
import {Fragment} from "react";

const App = () => {
    const isLoading = useContextSelector(ApiContext, c => c.isLoading)

    if(isLoading) {
        return (
            <div className="flex-1 inset-0 bg-linear-to-b from-white to-slate-100 flex justify-center items-center">
                LOADING
            </div>
        );
    }

    return (
        <Fragment>
            <Header/>
            <Modes/>
            <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)]">
                <Controller/>
                <Satellites/>
            </div>
        </Fragment>
    );
}

export default App