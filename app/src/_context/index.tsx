import { createContext} from '@fluentui/react-context-selector'
import { LocalProviderProps, ApiProviderProps, PanelsProviderProps } from '../types'

export const LocalContext = createContext<LocalProviderProps>({} as LocalProviderProps);

export const ApiContext = createContext<ApiProviderProps>({} as ApiProviderProps);

export const PanelsContext = createContext<PanelsProviderProps>({} as PanelsProviderProps);