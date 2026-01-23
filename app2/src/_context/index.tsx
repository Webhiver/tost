import { createContext} from '@fluentui/react-context-selector'
import { AppProviderProps, ApiProviderProps } from '../types'

export const AppContext = createContext<AppProviderProps>({});

export const ApiContext = createContext<ApiProviderProps>({});