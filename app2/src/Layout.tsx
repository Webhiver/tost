import LocalProvider from './_providers/LocalProvider'
import ApiProvider from './_providers/ApiProvider'
import App from './App.tsx'

const Layout = () => {

    // Host mode (default)
    return (

        <ApiProvider>
            <LocalProvider>
                <App/>
            </LocalProvider>
        </ApiProvider>
    )
}

export default Layout
