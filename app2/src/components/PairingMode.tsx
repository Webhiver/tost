import {useState, useEffect, useCallback, Fragment} from "react";
import {GrCheckmark, GrSatellite, GrLock, GrWifi, GrWifiLow, GrWifiMedium, GrWifiNone} from "react-icons/gr";
import {Network} from "../types"
import {scanNetworks, connectWifi} from "../api";
import {AiOutlineLoading} from "react-icons/ai";
import clsx from "clsx";
import {FieldClasses} from "../styles.ts";

const PairingMode = () => {
    const [networks, setNetworks] = useState<Network[]>([])
    const [isScanning, setIsScanning] = useState<boolean>(true)
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
    const [password, setPassword] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<boolean>(false)

    const handleScan = useCallback(async () => {
        setIsScanning(true)
        try {
            const data = await scanNetworks()
            setNetworks(data.networks || [])
        } catch (err) {
            setNetworks([])
        } finally {
            setIsScanning(false)
        }
    }, []);

    const handleConnect = useCallback(async () => {
        if (!selectedNetwork) return

        setIsSaving(true)

        setError(null)
        try {
            await connectWifi(selectedNetwork, password)
            setSuccess(true)
        } catch (err) {
            setError('Failed to save credentials')
        } finally {
            setIsSaving(false)
        }
    }, [selectedNetwork, password]);

    const handleBack = useCallback(() => {
        setSelectedNetwork(null)
        setPassword('')
        setError(null)
      }, []);

    useEffect(() => {
        handleScan();
    }, []);

    if (success) {
        return (
            <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:from-slate-950 dark:to-slate-800 dark:shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                <div className="p-6 flex flex-col justify-start items-start gap-2">
                    <div className="text-green-700 w-20 h-20 mb-6 bg-linear-to-br from-green-400 to-green-200 rounded-xl flex items-center justify-center text-4xl shadow-xl shadow-green-200 animate-float">
                        <GrCheckmark/>
                    </div>
                    <h1 className="text-2xl text-slate-500 dark:text-slate-300">Credentials Saved!</h1>
                    <div className="text-slate-400 dark:text-slate-400">Your TOST thermostat will restart and connect to your WiFi network.</div>
                </div>
            </div>
        );
    }

    if(selectedNetwork) {
        return (
            <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:from-slate-950 dark:to-slate-800 dark:shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                <div className="p-6 flex flex-col justify-start items-start gap-2">
                    <div className="text-amber-700 w-20 h-20 mb-6 bg-linear-to-br from-amber-400 to-amber-200 rounded-xl flex items-center justify-center text-4xl shadow-xl shadow-amber-200 animate-float">
                        <GrLock/>
                    </div>
                    <h1 className="text-2xl text-slate-500 dark:text-slate-300">{selectedNetwork}</h1>
                    <div className="text-slate-400 dark:text-slate-400">Enter the network password to connect</div>
                </div>
                <div className="flex-1 flex flex-col justify-start items-center gap-6">
                    <div className="w-full px-6">
                        <input
                            className={clsx(FieldClasses, "py-2")}
                            type="password"
                            value={password}
                            placeholder="WiFi Password"
                            autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && (
                            <div className="text-red-600 mt-1">
                                {error}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center items-center gap-4">
                        <button
                            onClick={handleConnect}
                            disabled={isSaving}
                            className="border border-amber-600/50 dark:border-amber-400/80 rounded-md px-3 py-1 flex justify-center text-normal text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-600/10 dark:hover:bg-amber-400/20 transition-colors"
                        >
                            Connect
                        </button>
                        <button
                            onClick={handleBack}
                            disabled={isSaving}
                            className="border border-slate-600/50 dark:border-slate-400/80 rounded-md px-3 py-1 flex justify-center text-normal text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-600/10 dark:hover:bg-slate-400/20 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-stretch justify-stretch overflow-hidden bg-linear-to-b from-white to-slate-100 rounded-t-3xl shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:from-slate-950 dark:to-slate-800 dark:shadow-[0_0_10px_rgba(0,0,0,0.8)]">
            <div className="p-6 flex flex-col justify-start items-start gap-2">
                <div className="text-amber-700 w-20 h-20 mb-6 bg-linear-to-br from-amber-400 to-amber-200 rounded-xl flex items-center justify-center text-4xl shadow-xl shadow-amber-200 animate-float">
                    <GrSatellite/>
                </div>
                <h1 className="text-2xl text-slate-500 dark:text-slate-300">WIFI Setup</h1>
                <div className="text-slate-400 dark:text-slate-400">Connect your TOST thermostat to your home WiFi network to get started</div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isScanning ? (
                    <div className="flex justify-center items-center gap-2 px-6">
                        <div className="size-6 border-3 border-slate-200 dark:border-slate-700 rounded-full relative">
                            <AiOutlineLoading className="text-amber-500 dark:text-amber-400 animate-spin size-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
                        </div>
                        <div className="text-lg text-slate-500 dark:text-slate-400 animate-pulse">Scanning for networks...</div>
                    </div>
                ) : (
                    <div className="flex flex-col justify-start items-stretch gap-4 px-6">
                        <Fragment>
                            {networks.map((network) => {
                                let WifiIcon = GrWifiNone;
                                if (network.strength === 4) {
                                    WifiIcon = GrWifi;
                                } else if (network.strength === 3) {
                                    WifiIcon = GrWifiMedium;
                                } else if (network.strength === 2) {
                                    WifiIcon = GrWifiLow;
                                } else if (network.strength === 1) {
                                    WifiIcon = GrWifiNone;
                                }
                                return (
                                    <div
                                        onClick={() => setSelectedNetwork(network.ssid)}
                                        key={network.ssid}
                                        className="cursor-pointer flex justify-stretch items-center gap-2 transition-colors border border-slate-300 hover:border-amber-400 dark:border-slate-600 bg-white/30 hover:bg-amber-400/10 dark:bg-black/30 rounded-md p-4"
                                    >
                                        <WifiIcon className="size-6 text-slate-500"/>
                                        <div className="text-slate-600">{network.ssid}</div>
                                        <div className="flex-1"/>
                                        <div className="text-slate-600 text-sm">{network.rssi}dBm</div>
                                    </div>
                                );
                            })}
                            {networks.length === 0 && (<div className="text-slate-600">No networks found</div>)}
                        </Fragment>
                    </div>
                )}
            </div>
            <div className="p-6 flex justify-center items-center">
                <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="col-span-4 border border-amber-600/50 dark:border-amber-400/80 rounded-md px-3 py-1 flex justify-center text-normal text-amber-600 dark:text-amber-400 cursor-pointer hover:bg-amber-600/10 dark:hover:bg-amber-400/20 transition-colors"
                >
                    Refresh Networks
                </button>
            </div>
        </div>
    );
}

export default PairingMode;