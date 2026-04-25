import React, {useState, useRef, useEffect, Fragment} from "react";
import {FaTimesCircle} from "react-icons/fa";
import {FaCircleCheck, FaTriangleExclamation} from "react-icons/fa6";
import {GrWifi, GrWifiMedium, GrWifiLow, GrWifiNone, GrSatellite, GrHomeRounded} from "react-icons/gr";
import { BiWifiOff } from "react-icons/bi";
import { ImNewTab } from "react-icons/im";
import {Swiper, SwiperSlide, SwiperRef} from 'swiper/react';
import {Mousewheel, Autoplay} from 'swiper/modules';
import 'swiper/css';
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, PanelsContext} from "../_context";
import {Device} from "../types";
import {useIntl} from "react-intl";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { TbCloudDownload } from "react-icons/tb";

const ThumbnailItem = ({device, index, width, swiperRef, intl}: {
    device: Device, index: number, width: number | string,
    swiperRef: React.RefObject<SwiperRef | null>, intl: ReturnType<typeof useIntl>
}) => {
    let deviceStatus = null;
    if (device.active) {
        deviceStatus = <span className="font-sans tracking-wider bg-green-600/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3 lowercase">{intl.formatMessage({id: "satellite.status.active"})}</span>;
    }
    if (!device.active && !device.satellite) {
        deviceStatus = <span className="font-sans tracking-wider bg-indigo-400/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3 lowercase">{intl.formatMessage({id: "satellite.status.fallback"})}</span>;
    }
    if (!device.active && device.satellite) {
        deviceStatus = <span className="font-sans tracking-wider bg-slate-300 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3 lowercase">{intl.formatMessage({id: "satellite.status.ignored"})}</span>;
    }
    if (!device.healthy) {
        deviceStatus = <span className="font-sans tracking-wider bg-amber-500/50 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3 lowercase">{intl.formatMessage({id: "satellite.status.broken"})}</span>;
    }
    if (!device.online) {
        deviceStatus = <span className="font-sans tracking-wider bg-red-600/40 text-xs text-black/60 px-1.5 py-0.5 rounded-full leading-3 lowercase">{intl.formatMessage({id: "satellite.status.offline"})}</span>;
    }
    console.log(device);
    return (
        <div
            className="rounded-b-md flex flex-col items-center justify-center gap-1 text-xs cursor-pointer relative pt-3 pb-3 flex-shrink-0"
            style={{width}}
            onClick={() => swiperRef.current ? swiperRef.current.swiper.slideToLoop(index, 300) : null}
        >
            {!device.satellite
                ? <GrHomeRounded className="size-5 stroke-slate-500 mb-1 dark:stroke-slate-300"/>
                : <GrSatellite className="size-5 stroke-slate-500 mb-1 dark:stroke-slate-300"/>
            }
            {(device.satellite && device.firmwareUpdateAvailable) &&
                <TbCloudDownload className="text-sky-600 dark:text-sky-400 animate-bounce absolute top-2 left-3 size-4"/>
            }
            <span className="font-mono text-slate-500 leading-3 dark:text-slate-400">{device.online ? device.temperature?.toFixed(1) ?? "--" : "--"}°C</span>
            <span className="font-mono text-slate-400 leading-3 dark:text-slate-300">{device.online ? device.humidity?.toFixed(1) ?? "--" : "--"}%</span>
            {deviceStatus}
        </div>
    );
};

const Satellites = () => {

    const swiperRef = useRef<SwiperRef>(null);

    const flameMode = useContextSelector(LocalContext, c => c.flameMode);
    const devices = useContextSelector(LocalContext, c => c.devices);
    const activeDeviceIndex = useContextSelector(LocalContext, c => c.activeDeviceIndex);
    const toggleViewSatellite = useContextSelector(PanelsContext, c => c.toggleViewSatellite);
    const intl = useIntl();

    const thumbnailsRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [slideIndex, setSlideIndex] = useState<number>(0);
    const [thumbPx, setThumbPx] = useState<number>(0);
    const [highlightLeft, setHighlightLeft] = useState<number>(0);
    const [hasScrollLeft, setHasScrollLeft] = useState<boolean>(false);
    const [hasScrollRight, setHasScrollRight] = useState<boolean>(false);

    const needsScroll = devices.length > 5;

    useEffect(() => {
        if (flameMode === 'one') {
            swiperRef.current ? swiperRef.current.swiper.autoplay.stop() : null;
        } else {
            swiperRef.current ? swiperRef.current.swiper.autoplay.start() : null;
        }
    }, [flameMode]);

    useEffect(() => {
        swiperRef.current ? swiperRef.current.swiper.slideTo(activeDeviceIndex) : null;
    }, [activeDeviceIndex]);

    useEffect(() => {
        const el = thumbnailsRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => setThumbPx(entry.contentRect.width * 0.19));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!needsScroll || !scrollRef.current || thumbPx === 0) return;
        const container = scrollRef.current;
        const paddingLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const targetScrollLeft = paddingLeft + thumbPx * slideIndex - container.clientWidth / 2 + thumbPx / 2;
        const actualScrollLeft = Math.max(0, Math.min(maxScroll, targetScrollLeft));
        setHighlightLeft(paddingLeft + thumbPx * slideIndex - actualScrollLeft);
        setHasScrollLeft(actualScrollLeft > 0);
        setHasScrollRight(actualScrollLeft < maxScroll - 1);
        container.scrollTo({left: actualScrollLeft, behavior: 'smooth'});
    }, [slideIndex, thumbPx, needsScroll]);

    return (
        <div className="w-full pb-8">
            <div className="border-y border-slate-300 -mx-3 px-3 bg-linear-to-t from-slate-50 to-slate-100 dark:border-slate-950 dark:from-slate-900 dark:to-slate-950">
                <Swiper
                    ref={swiperRef}
                    initialSlide={0}
                    slidesPerView={1}
                    spaceBetween={0}
                    autoplay={{delay: 5000, disableOnInteraction: true, pauseOnMouseEnter: true}}
                    loop={devices.length > 10}
                    slideToClickedSlide={false}
                    touchEventsTarget={'container'}
                    mousewheel={true}
                    modules={[Mousewheel, Autoplay]}
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
                        if(!device.online) {
                            WifiIcon = BiWifiOff;
                        }

                        let status = (
                            <div className="flex items-center gap-1 text-base font-light text-slate-400"><FaCircleCheck className="size-3.5"/>{intl.formatMessage({id: "satellite.status.operational"})}</div>
                        );
                        if (!device.healthy) {
                            status = (
                                <div className="flex items-center gap-1 text-base font-light text-amber-500"><FaTriangleExclamation className="size-3.5"/>{device.error}</div>
                            );
                        }
                        if (!device.online) {
                            status = (
                                <div className="flex items-center gap-1 text-base font-light text-red-600"><FaTimesCircle className="size-3.5"/>{intl.formatMessage({id: "satellite.status.offline"})}</div>
                            );
                        }

                        return (
                            <SwiperSlide className="w-full" key={`device-${device.id}-${index}`}>
                                <div className="relative w-full flex flex-col items-stretch justify-start gap-3 py-4 px-12 cursor-grab active:cursor-grabbing">
                                    {/*<PiThermometerSimpleDuotone className="fill-slate-400 absolute top-6 right-14 size-5"/>*/}
                                    {(device.satellite && device.online) &&
                                        <ImNewTab onClick={() => toggleViewSatellite(device)} className="cursor-pointer size-5 fill-slate-400 absolute top-5 left-5 hover:fill-slate-600"/>
                                    }
                                    <WifiIcon className="stroke-slate-400 fill-slate-400 absolute top-5 right-5 size-6"/>

                                    <div className="flex justify-center items-center gap-3">
                                        <div className="text-2xl text-slate-500 font-normal dark:text-slate-400">{device.name}</div>
                                    </div>
                                    <div className="flex justify-around items-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">{intl.formatMessage({id: "satellite.temperature"})}</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400 dark:text-slate-300">{device.online ? device.temperature?.toFixed(1) ?? "--" : "--"}°C
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="text-lg font-extralight text-slate-500 dark:text-slate-400">{intl.formatMessage({id: "satellite.humidity"})}</div>
                                            <div
                                                className="text-4xl font-mono text-slate-400 dark:text-slate-300">{device.online ? device.humidity?.toFixed(1) ?? "--" : "--"}%
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
            <div
                ref={thumbnailsRef}
                className={`relative${needsScroll ? '' : ' flex justify-center items-center'}`}
                id="slider-thumbnails"
            >
                <div
                    id="slider-thumbnails-highlight"
                    className="absolute flex justify-center -top-px bottom-0 transition-all rounded-b-lg bg-slate-50 border border-t-0 border-slate-300 dark:bg-slate-900 dark:border-slate-950"
                    style={needsScroll
                        ? {width: thumbPx, left: highlightLeft}
                        : {width: '19%', left: `${19 * slideIndex + (100 - devices.length * 19) / 2}%`}
                    }
                />
                {needsScroll ? (
                    <Fragment>
                        <div data-visible={hasScrollLeft ? true : undefined} className="absolute left-0 top-0 bottom-0 w-3 pointer-events-none z-10 flex justify-center items-center opacity-0 data-visible:opacity-100 transition-all">
                            <FiChevronLeft/>
                        </div>
                        <div data-visible={hasScrollRight ? true : undefined} className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none z-10 flex justify-center items-center opacity-0 data-visible:opacity-100 transition-all">
                            <FiChevronRight/>
                        </div>
                        <div ref={scrollRef} className="flex overflow-x-hidden px-3">
                            {devices.map((device: Device, index: number) => <ThumbnailItem key={`device-icon-${device.id}-${index}`} device={device} index={index} width={thumbPx} swiperRef={swiperRef} intl={intl}/>)}
                        </div>
                    </Fragment>
                ) : (
                    devices.map((device: Device, index: number) => <ThumbnailItem key={`device-icon-${device.id}-${index}`} device={device} index={index} width="19%" swiperRef={swiperRef} intl={intl}/>)
                )}
            </div>
        </div>
    );
}

export default Satellites;
