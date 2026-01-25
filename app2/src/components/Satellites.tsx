import {useState, useRef} from "react";
import {Thermometer, WifiEmpty, WifiLow, WifiMedium, WifiFull, HouseCheck, LocationCheck, WebSocket} from "./Icons";
import {GrWifi, GrWifiMedium, GrWifiLow, GrWifiNone, GrSatellite, GrHomeRounded} from "react-icons/gr";
import {PiThermometerSimpleDuotone} from "react-icons/pi";
import {Swiper, SwiperSlide, SwiperRef} from 'swiper/react';
import {Mousewheel} from 'swiper/modules';
import 'swiper/css';
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../_context";
import {Satellite, SensorData, Device} from "../types";

const Satellites = () => {

    const swiperRef = useRef<SwiperRef>(null);

    const devices = useContextSelector(LocalContext, c => c.devices);

    const [slideIndex, setSlideIndex] = useState<number>(0);

    return (
        <div className="w-full">
            <div
                className="bg-linear-to-r from-slate-200 via-slate-50 to-slate-200 inset-shadow-[0_0_10px] inset-shadow-slate-300 -mx-3 px-3">
                <Swiper
                    ref={swiperRef}
                    initialSlide={0}
                    slidesPerView={1}
                    spaceBetween={0}
                    loop={devices.length > 1}
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

                        let ActiveIcon = <PiThermometerSimpleDuotone className="fill-slate-300 size-6"/>;
                        if(device.active){
                            ActiveIcon = <PiThermometerSimpleDuotone className="fill-slate-600 size-6"/>;
                        }

                        return (
                            <SwiperSlide className="w-full" key={`device-${device.id}-${index}`}>
                                <div
                                    className="w-full flex flex-col items-stretch justify-start gap-2 px-10 py-6 cursor-grab active:cursor-grabbing">
                                    <div className="flex justify-stretch items-center">
                                        {ActiveIcon}
                                        <div className="flex-1 flex flex-col justify-start items-center">
                                            <div
                                                className="text-xl text-slate-500 font-light leading-6">{device.name}</div>
                                            <div className="text-base font-extralight text-orange-700">Device is
                                                offline
                                            </div>
                                        </div>
                                        <WifiIcon className="stroke-slate-600 size-7"/>
                                    </div>
                                    <div className="flex justify-around items-start">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-400">Temperature</div>
                                            <div
                                                className="text-4xl font-light text-slate-500">{device.temperature?.toFixed(1) ?? "--"}°C
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-400">Humidity</div>
                                            <div
                                                className="text-4xl font-light text-slate-500">{device.humidity?.toFixed(1) ?? "--"}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
            <div className="flex justify-center items-center gap-6 py-5">
                {devices.map((device: Device, index: number) => {
                    return (
                        <div
                            key={`device-icon-${device.id}-${index}`}
                            className="rounded-sm flex flex-col items-center text-sm gap-1 cursor-pointer"
                            onClick={event => swiperRef.current.swiper.slideToLoop(index, 300)}
                        >
                            {device.id === "host" ? <GrHomeRounded className="size-4 stroke-slate-500"/> : <GrSatellite className="size-4 stroke-slate-500"/>}
                            <span className="font-normal text-slate-500">{device.temperature?.toFixed(1) ?? "--"}°C</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Satellites;