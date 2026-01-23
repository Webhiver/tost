import { createContext} from '@fluentui/react-context-selector'
import { AppProviderProps, ApiProviderProps } from '../types'

export const AppContext = createContext<AppProviderProps | null>(null);

export const ApiContext = createContext<ApiProviderProps | null>(null);