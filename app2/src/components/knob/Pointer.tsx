import {RefObject, useCallback, useRef, useState, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext, ApiContext} from "../../_context";
import {
    getStartXY,
    calculatePercentage,
    getValueFromPercentage,
    stepsToSnapTo,
    findClosest
} from "./utils";

let audioCtx: AudioContext | null = null;

const triggerFeedback = (muted: boolean = false) => {
    // Try Native Haptics (Android)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(20); // Very short tick
        // return; // Uncomment if you don't want sound on Android
    }

    // iOS Fallback: Procedural 'Click' Sound
    try {
        if (!audioCtx) {
            // @ts-ignore - Handle WebKit prefix for older Safari if needed
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
        }

        if (audioCtx) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (muted) {
                // Muted sound: lower pitch (thud), lower volume
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(80, audioCtx.currentTime);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.001);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
            } else {
                // Regular sharp click: high pitch, higher volume
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.001);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
            }

            // A short, high-frequency 'click'
            // oscillator.type = 'sine';
            // oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
            //
            // // Very short envelope for a crisp click
            // gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            // gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.001);
            // gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.04);
        }
    } catch (e) {
        // Audio not supported or blocked
    }
};

interface PointerProps {
    rootRef: RefObject<HTMLDivElement>;
}

export const Pointer = (props: PointerProps) => {
    const mode = useContextSelector(LocalContext, c => c.mode);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const knobWidth = useContextSelector(LocalContext, c => c.knobWidth);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(LocalContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(LocalContext, c => c.knobAngleOffset);
    const knobMinTemp = useContextSelector(LocalContext, c => c.knobMinTemp);
    const knobMaxTemp = useContextSelector(LocalContext, c => c.knobMaxTemp);
    const knobSteps = useContextSelector(LocalContext, c => c.knobSteps);
    const knobPercentage = useContextSelector(LocalContext, c => c.knobPercentage);
    const setTargetTemp = useContextSelector(LocalContext, c => c.setTargetTemp);
    const setKnobPercentage = useContextSelector(LocalContext, c => c.setKnobPercentage);
    const cancelPendingGetStatus = useContextSelector(ApiContext, c => c.cancelPendingGetStatus);
    const stopGettingStatus = useContextSelector(ApiContext, c => c.stopGettingStatus);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);
    const knobRadius = knobSize / 2 - knobWidth + 8;
    const knobCenter = knobSize / 2;
    const [trackingActive, setTrackingActive] = useState(false);

    const lastFeedbackValue = useRef<number | null>(null);

    const {
        rootRef,
    } = props;

    const startXY = useRef<{ startX: number, startY: number }>({startX: 0, startY: 0});

    const heatZoneSize = 20;
    const heatZoneColor = 'transparent';
    const width = 9;
    const height = knobWidth - 16;
    const color = "#fff";

    const startTracking = useCallback((event?: ReactMouseEvent | ReactTouchEvent) => {
        event?.stopPropagation();
        event?.preventDefault();
        cancelPendingGetStatus();
        stopGettingStatus();
        setTrackingActive(true);
        startXY.current = getStartXY(rootRef, knobSize);

        triggerFeedback(true);
    }, [rootRef, knobSize, cancelPendingGetStatus, stopGettingStatus]);

    const stopTracking = useCallback(() => {
        setTrackingActive(false);
        startXY.current = {startX: 0, startY: 0};

        lastFeedbackValue.current = null; // Reset for next drag

        submitConfig({target_temperature: targetTemp});
    }, [targetTemp, submitConfig]);

    const handleMove = useCallback((event: MouseEvent | TouchEvent) => {
        event.stopPropagation();
        if (event.cancelable) {
            event.preventDefault();
        }

        let pageX = 0;
        let pageY = 0;
        if (event && "touches" in event) {
            pageX = event.changedTouches[0].pageX;
            pageY = event.changedTouches[0].pageY;
        }
        if (event && "pageX" in event) {
            pageX = event.pageX;
            pageY = event.pageY;
        }

        let percentage = calculatePercentage({
            startX: startXY.current.startX,
            startY: startXY.current.startY,
            pageX: pageX,
            pageY: pageY,
            angleOffset: knobAngleOffset,
            angleRange: knobAngleRange,
        });

        const stepSnappingPercentages = stepsToSnapTo(knobSteps, true);
        if (stepSnappingPercentages) {
            percentage = findClosest(stepSnappingPercentages, percentage);
        }

        let newTargetTemp = getValueFromPercentage(knobMinTemp, knobMaxTemp, percentage);
        newTargetTemp = parseFloat(newTargetTemp.toFixed(2));

        if (lastFeedbackValue.current !== newTargetTemp) {
            triggerFeedback();
            lastFeedbackValue.current = newTargetTemp;
        }

        setKnobPercentage(percentage);
        setTargetTemp(newTargetTemp);

    }, [knobAngleRange, knobAngleOffset, knobMinTemp, knobMaxTemp, knobSteps]);

    useEffect(() => {
        if (trackingActive) {
            //console.log('attach');
            document.body.addEventListener('mousemove', handleMove as EventListener);
            document.body.addEventListener('mouseup', stopTracking);
            const nonPassiveTouch = {passive: false};
            document.body.addEventListener('touchmove', handleMove as EventListener, nonPassiveTouch);
            document.body.addEventListener('touchend', stopTracking);
            return () => {
                //console.log('detach');
                document.body.removeEventListener('mousemove', handleMove as EventListener);
                document.body.removeEventListener('mouseup', stopTracking);
                document.body.removeEventListener('touchmove', handleMove as EventListener);
                document.body.removeEventListener('touchend', stopTracking);
            };
        }
    }, [trackingActive, handleMove, stopTracking]);

    if(mode === "off"){
        return null;
    }

    return (
        <g
            onMouseDown={startTracking}
            onTouchStart={startTracking}
            fill={'none'}
            transform={`rotate(${knobAngleOffset + knobAngleRange * knobPercentage} ${knobCenter} ${knobCenter}) translate( ${knobCenter - width / 2} ${knobCenter - knobRadius - height})`}
        >
            <rect
                width={width}
                height={height}
                fill={color}
                rx={width / 2}
                ry={width / 2}
                style={{
                    strokeWidth: heatZoneSize,
                    stroke: heatZoneColor,
                    cursor: "move",
                    paintOrder: "stroke",
                    touchAction: "none",
                }}
            />
        </g>
    );
};
