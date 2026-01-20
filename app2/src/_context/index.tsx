import { createContext} from '@fluentui/react-context-selector'
import { AppProviderProps } from '../types'

const AppContext = createContext<AppProviderProps>({
  isLoading: true,
  flame: false,
})

export default AppContext