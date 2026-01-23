// import {useContextSelector} from "@fluentui/react-context-selector";
// import LocalContext from "../_context";
import Spacer from "./components/Spacer";
import Header from "./components/Header";
import Controller from "./components/Controller";

const App = () => {
    //const flame = useContextSelector(LocalContext, c => c.flame)

    return (
        <div className="w-screen h-screen bg-slate-200 flex items-center justify-center">
            <div className="overflow-hidden bg-linear-to-b from-white to-slate-100 w-screen h-screen lg:w-md lg:h-auto lg:rounded-2xl lg:shadow-xl">
                <Spacer/>
                <Header/>
                <Spacer/>
                <Controller/>
                {/*SCHEDULER*/}
                {/*SENSORS*/}
                {/*SATELLITES*/}
                <Spacer/>
            </div>
        </div>
    )
}

export default App