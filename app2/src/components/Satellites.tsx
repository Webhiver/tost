import {useState, useRef} from "react";
import {FaTimesCircle} from "react-icons/fa";
import {FaCircleCheck, FaTriangleExclamation} from "react-icons/fa6";
import {GrWifi, GrWifiMedium, GrWifiLow, GrWifiNone, GrSatellite, GrHomeRounded} from "react-icons/gr";
import {Swiper, SwiperSlide, SwiperRef} from 'swiper/react';
import {Mousewheel} from 'swiper/modules';
import 'swiper/css';
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../_context";
import {Device} from "../types";

const Satellites = () => {

    const swiperRef = useRef<SwiperRef>(null);

    const devices = useContextSelector(LocalContext, c => c.devices);

    const [slideIndex, setSlideIndex] = useState<number>(0);

    return (
        <div className="w-full pb-8">
            <div className="border-y border-slate-300 -mx-3 px-3 bg-linear-to-t from-slate-50 to-slate-100 dark:border-slate-950 dark:from-slate-900 dark:to-slate-950">
                <Swiper
                    ref={swiperRef}
                    initialSlide={0}
                    slidesPerView={1}
                    spaceBetween={0}
                    loop={devices.length > 10}
                    slideToClickedSlide={false}
                    touchEventsTarget={'container'}
                    mousewheel={true}
                    modules={[Mousewheel]}
                    onActiveIndexChange={(swipper) => {
                        setSlideIndex(swipper.realIndex);
                    }}
                >
                    {devices.map((device: Device, index: number) => {
                        let WifiIcon = GrWifiNone;
                        if (device.wifiStrength === 4) {
                            WifiIcon = GrWifi;
                        } else if (device.wifiStrength === 3) {
                            WifiIcon = GrWifiMedium;
                        } else if (device.wifiStrength === 2) {
                            WifiIcon = GrWifiLow;
                        } else if (device.wifiStrength === 1) {
                            WifiIcon = GrWifi;
                        }

                        let status = (
                            <div className="flex items-center gap-1 text-base font-light text-slate-400"><FaCircleCheck className="size-3.5"/>Operational</div>
                        );
                        if (!device.healthy) {
                            status = (
                                <div className="flex items-center gap-1 text-base font-light text-amber-500"><FaTriangleExclamation className="size-3.5"/>{device.error}</div>
                            );
                        }
                        if (!device.online) {
                            status = (
                                <div className="flex items-center gap-1 text-base font-light text-red-600"><FaTimesCircle className="size-3.5"/>Offline</div>
                            );
                        }

                        return (
                            <SwiperSlide className="w-full" key={`device-${device.id}-${index}`}>
                                <div className="relative w-full flex flex-col items-stretch justify-start gap-3 py-4 px-12 cursor-grab active:cursor-grabbing">
                                    {/*<PiThermometerSimpleDuotone className="fill-slate-400 absolute top-6 right-14 size-5"/>*/}
                                    <WifiIcon className="stroke-slate-400 absolute top-5 right-5 size-6"/>

                                    <div className="flex justify-center items-center gap-3">
                                        <div className="text-2xl text-slate-500 font-normal dark:text-slate-400">{device.name}</div>
                                    </div>
                                    <div className="flex justify-around items-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">Temperature</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400 dark:text-slate-300">{device.temperature?.toFixed(1) ?? "--"}°C
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">Humidity</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400 dark:text-slate-300">{device.humidity?.toFixed(1) ?? "--"}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-center items-center">
                                        {status}
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
            <div className="flex justify-center items-center relative">
                <div className="w-[20%] absolute flex justify-center -top-px bottom-0 transition-all rounded-b-lg bg-slate-50 border border-t-0 border-slate-300 dark:bg-slate-900 dark:border-slate-950" style={{left: `${20 * slideIndex + ((100 - devices.length * 20) / 2)}%`}}/>
                {devices.map((device: Device, index: number) => {
                    let deviceStatus = null;
                    if (device.active) {
                        deviceStatus = <span className="font-sans tracking-wider bg-green-600/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3">active</span>
                    }
                    if(!device.active && !device.satellite){
                        deviceStatus = <span className="font-sans tracking-wider bg-indigo-400/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3">fallback</span>
                    }
                    if(!device.active && device.satellite){
                        deviceStatus = <span className="font-sans tracking-wider bg-slate-300 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3">ignored</span>
                    }
                    if(!device.healthy){
                        deviceStatus = <span className="font-sans tracking-wider bg-amber-500/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3">broken</span>
                    }
                    if(!device.online){
                        deviceStatus = <span className="font-sans tracking-wider bg-red-600/40 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3">offline</span>
                    }

                    return (
                        <div
                            key={`device-icon-${device.id}-${index}`}
                            className="w-[20%] rounded-b-md flex flex-col items-center justify-center gap-1 text-xs cursor-pointer relative pt-3 pb-3"
                            onClick={() => swiperRef.current ? swiperRef.current.swiper.slideToLoop(index, 300) : null}
                        >
                            {!device.satellite ?
                                <GrHomeRounded className="size-5 stroke-slate-500 mb-1 dark:stroke-slate-300"/> :
                               <GrSatellite className="size-5 stroke-slate-500 mb-1 dark:stroke-slate-300"/>
                            }
                            <span className="font-mono text-slate-500 leading-3 dark:text-slate-400">{device.temperature?.toFixed(1) ?? "--"}°C</span>
                            <span className="font-mono text-slate-400 leading-3 dark:text-slate-300">{device.humidity?.toFixed(1) ?? "--"}%</span>
                            {deviceStatus}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Satellites;