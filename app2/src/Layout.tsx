import AppProvider from './_providers/AppProvider'
import ApiProvider from './_providers/ApiProvider'
import App from './App.tsx'

const Layout = () => {

  // Host mode (default)
  return (
    <AppProvider>
        <ApiProvider>
            <App />
        </ApiProvider>
    </AppProvider>
  )
}

export default Layout
