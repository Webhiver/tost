import {ReactNode, useCallback, useEffect, useRef} from "react";
import {AppContext, ApiContext} from "../_context";
import {updateConfig} from "../api";
import {useContextSelector} from "@fluentui/react-context-selector";

const ApiProvider = ({children}: { children: ReactNode }) => {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelPendingFetch = useContextSelector(AppContext, c => c.cancelPendingFetch);

    const submitConfig = useCallback((targetTemp: number) => {
        cancelPendingFetch();

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(async () => {
            debounceRef.current = null
            try {
                await updateConfig({target_temperature: targetTemp})
            } catch (err) {
                console.error('Failed to update target temp:', err)
            }
        }, 500);
    }, [cancelPendingFetch]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, []);

    return (
        <ApiContext.Provider value={{
            submitConfig,
        }}>
            {children}
        </ApiContext.Provider>
    )
}

export default ApiProvider;