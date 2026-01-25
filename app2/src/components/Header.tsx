// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"

const Header = () => {
    return (
        <header className="flex justify-between items-center gap-4 px-6 py-5">
            <TostLogo width={90} height={24}/>
            <div className="flex-1"/>
            <Menu className="fill-slate-500 size-6"/>
        </header>
    )
}

export default Header