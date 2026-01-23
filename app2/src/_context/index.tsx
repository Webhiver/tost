import { createContext} from '@fluentui/react-context-selector'
import { LocalProviderProps, ApiProviderProps } from '../types'

export const LocalContext = createContext<LocalProviderProps>({});

export const ApiContext = createContext<ApiProviderProps>({});