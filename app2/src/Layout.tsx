import LocalProvider from './_providers/LocalProvider'
import ApiProvider from './_providers/ApiProvider'
import App from './App.tsx'

const Layout = () => {

    // Host mode (default)
    return (
        <div className="w-screen h-screen bg-slate-200 flex items-center justify-center">
            <div className="overflow-hidden bg-slate-100 w-screen h-screen lg:w-104 lg:h-auto lg:min-h-200 lg:rounded-3xl lg:shadow-xl flex flex-col justify-stretch">
                <ApiProvider>
                    <LocalProvider>
                        <App/>
                    </LocalProvider>
                </ApiProvider>
            </div>
        </div>
    )
}

export default Layout
