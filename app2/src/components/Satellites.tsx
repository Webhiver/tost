import {useState, useRef} from "react";
import {FaTimesCircle} from "react-icons/fa";
import {FaCircleCheck, FaTriangleExclamation} from "react-icons/fa6";
import {GrWifi, GrWifiMedium, GrWifiLow, GrWifiNone, GrSatellite, GrHomeRounded} from "react-icons/gr";
import { MdThermostat } from "react-icons/md";
import {BsExclamationTriangle} from "react-icons/bs";
import {LiaTimesCircle} from "react-icons/lia";
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
        <div className="w-full">
            <div
                className="border-y border-slate-300 -mx-3 px-3 inset-shadow-[0_0_10px] inset-shadow-slate-200">
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
                                        <div className="text-2xl text-slate-500 font-normal">{device.name}</div>
                                    </div>
                                    <div className="flex justify-around items-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500">Temperature</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400">{device.temperature?.toFixed(1) ?? "--"}°C
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500">Humidity</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400">{device.humidity?.toFixed(1) ?? "--"}%
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
            <div className="flex justify-center items-center pt-5 pb-8 relative">
                {devices.map((device: Device, index: number) => {
                    let deviceIcon = null;
                    if (device.active) {
                        deviceIcon =
                            <MdThermostat className="fill-red-600 size-4 absolute -top-1 left-2"/>;
                    }
                    if(!device.active && !device.satellite){
                        deviceIcon =
                            <MdThermostat className="fill-indigo-500 size-4 absolute -top-1 left-2"/>;
                    }
                    if(!device.active && device.satellite){
                        deviceIcon =
                            <MdThermostat className="fill-stone-400 size-4 absolute -top-1 left-2"/>;
                    }
                    if (!device.healthy) {
                        deviceIcon = <BsExclamationTriangle className="fill-amber-500 size-4 absolute -top-1 left-2"/>;
                    }
                    if (!device.online) {
                        deviceIcon = <LiaTimesCircle className="fill-red-600 size-4 absolute -top-1 left-2"/>;
                    }

                    return (
                        <div
                            key={`device-icon-${device.id}-${index}`}
                            className="w-[15%] rounded-sm flex flex-col items-center gap-1 text-sm cursor-pointer relative"
                            onClick={() => swiperRef.current ? swiperRef.current.swiper.slideToLoop(index, 300) : null}
                        >
                            {!device.satellite ? <GrHomeRounded className="size-5 stroke-slate-500 mb-2"/> :
                                <GrSatellite className="size-5 stroke-slate-500 mb-2"/>}
                            <span
                                className="font-mono text-slate-500 leading-3">{device.temperature?.toFixed(1) ?? "--"}°C</span>
                            <span
                                className="font-mono text-slate-400 leading-3">{device.humidity?.toFixed(1) ?? "--"}%</span>
                            {deviceIcon}
                        </div>
                    );
                })}
                <div className="w-[15%] absolute flex justify-center bottom-4.5 transition-all"
                     style={{left: `${15 * slideIndex + ((100 - devices.length * 15) / 2)}%`}}>
                    <div className="w-8 h-1.5 bg-orange-300 rounded-full"></div>
                </div>
            </div>
        </div>
    );
}

export default Satellites;