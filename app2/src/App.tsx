// import {useContextSelector} from "@fluentui/react-context-selector";
// import AppContext from "../_context";
import Header from "./components/Header.tsx";
import Controller from "./components/Controller.tsx";

const App = () => {
    //const flame = useContextSelector(AppContext, c => c.flame)

    return (
        <div className="w-screen h-screen bg-slate-200 flex items-center justify-center">
            <div className="overflow-hidden bg-linear-to-b from-white to-slate-100 w-screen h-screen lg:w-md lg:h-auto lg:rounded-2xl lg:shadow-xl">
                <div className="h-5"/>
                <Header/>
                <div className="h-5"/>
                <Controller/>
                {/*SCHEDULER*/}
                {/*SENSORS*/}
                {/*SATELLITES*/}
                <div className="h-5"/>
            </div>
        </div>
    )
}

export default App