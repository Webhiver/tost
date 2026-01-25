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
            <div className="overflow-hidden bg-linear-to-b from-white to-slate-100 w-screen h-screen lg:w-md lg:h-auto lg:rounded-3xl lg:shadow-xl">
                <Spacer/>
                <Header/>
                <Spacer/>
                <div className="flex justify-center items-center">
                    <div className="w-25 text-center text-slate-500 border border-slate-300 bg-slate-100 px-2 py-2 rounded-s-lg">OFF</div>
                    <div className="w-25 text-center text-lime-700 border border-slate-300 bg-lime-200 px-2 py-2">MANUAL</div>
                    <div className="w-25 text-center text-slate-500 border border-slate-300 bg-slate-100 px-2 py-2 rounded-e-lg">SCHEDULE</div>
                </div>
                <Spacer/>
                <Controller/>
                {/*SCHEDULER*/}
                <Satellites/>
                {/*SATELLITES*/}
            </div>
        </div>
    );
}

export default App