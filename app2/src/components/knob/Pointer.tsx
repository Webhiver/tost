import {RefObject, useCallback, useRef, useState, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {AppContext, ApiContext} from "../../_context";
import {
    getStartXY,
    calculatePercentage,
    getValueFromPercentage,
    stepsToSnapTo,
    findClosest
} from "./utils";

interface PointerProps {
    rootRef: RefObject<HTMLDivElement>;
}

export const Pointer = (props: PointerProps) => {
    const targetTemp = useContextSelector(AppContext, c => c.targetTemp);
    const knobWidth = useContextSelector(AppContext, c => c.knobWidth);
    const knobSize = useContextSelector(AppContext, c => c.knobSize);
    const knobAngleRange = useContextSelector(AppContext, c => c.knobAngleRange);
    const knobAngleOffset = useContextSelector(AppContext, c => c.knobAngleOffset);
    const knobMinTemp = useContextSelector(AppContext, c => c.knobMinTemp);
    const knobMaxTemp = useContextSelector(AppContext, c => c.knobMaxTemp);
    const knobSteps = useContextSelector(AppContext, c => c.knobSteps);
    const knobPercentage = useContextSelector(AppContext, c => c.knobPercentage);
    const setTargetTemp = useContextSelector(AppContext, c => c.setTargetTemp);
    const setKnobPercentage = useContextSelector(AppContext, c => c.setKnobPercentage);
    const cancelPendingFetch = useContextSelector(AppContext, c => c.cancelPendingFetch);
    const resetAndStartRefreshing = useContextSelector(AppContext, c => c.resetAndStartRefreshing);
    const submitConfig = useContextSelector(ApiContext, c => c.submitConfig);
    const knobRadius = knobSize / 2 - knobWidth + 8;
    const knobCenter = knobSize / 2;
    const [trackingActive, setTrackingActive] = useState(false);

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
        setTrackingActive(true);
        startXY.current = getStartXY(rootRef, knobSize);
    }, [rootRef, knobSize, cancelPendingFetch]);

    const stopTracking = useCallback(() => {
        setTrackingActive(false);
        startXY.current = {startX: 0, startY: 0};
        submitConfig(targetTemp);
    }, [targetTemp]);

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

        setKnobPercentage(percentage);
        setTargetTemp(newTargetTemp);

        //submitConfig(newTargetTemp);

    }, [knobAngleRange, knobAngleOffset, knobMinTemp, knobMaxTemp, knobSteps, cancelPendingFetch, resetAndStartRefreshing]);

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
