// import {useContextSelector} from "@fluentui/react-context-selector";
// import LocalContext from "../_context";
import Spacer from "./components/Spacer";
import Header from "./components/Header";
import Controller from "./components/Controller";
import Satellites from "./components/Satellites";

const App = () => {
    //const flame = useContextSelector(LocalContext, c => c.flame)

    return (
        <div className="w-screen h-screen bg-slate-200 flex items-center justify-center">
            <div className="overflow-hidden bg-slate-100 w-screen h-screen lg:w-104 lg:h-auto lg:rounded-3xl lg:shadow-xl flex flex-col justify-stretch">
                <Header/>
                <div className="flex justify-center items-center gap-6 pb-5">
                    <div className="text-slate-400 font-medium">OFF</div>
                    <div className="text-lime-600 font-medium">MANUAL</div>
                    <div className="text-slate-400 font-medium">SCHEDULE</div>
                </div>
                <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)]">
                    <Controller/>
                    <Satellites/>
                </div>
            </div>
        </div>
    );
}

export default App