import AppProvider from './_providers/AppProvider'
import App from './App.tsx'

const Layout = () => {

  // Host mode (default)
  return (
    <AppProvider>
        <App />
    </AppProvider>
  )
}

export default Layout
