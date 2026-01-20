// @ts-ignore
import {TostLogo, Menu} from "./Icons.jsx"

const Header = () => {
    return (
        <header className="flex justify-between items-center gap-4 px-6">
            <TostLogo width={90} height={24}/>
            <div className="flex-1"/>
            <Menu/>
        </header>
    )
}

export default Header