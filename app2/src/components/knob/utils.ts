import { RefObject } from 'react';

export const clamp = (min: number, max: number, value: number): number =>
    Math.max(min, Math.min(max, value));

interface CalculatePercentageData {
    startX: number;
    startY: number;
    pageX: number;
    pageY: number;
    angleOffset: number;
    angleRange: number;
}

export const calculatePercentage = (data: CalculatePercentageData): number => {
    const {
        startX,
        startY,
        pageX,
        pageY,
        angleOffset,
        angleRange,
    } = data;

    const x = startX - pageX;
    const y = startY - pageY;
    const degree = (Math.atan2(-y, -x) * 180) / Math.PI + 90 - angleOffset;
    const angle = degree < 0 ? degree + 360 : degree % 360;

    if (angle <= angleRange) {
        return clamp(0, 1, angle / angleRange)
    } else {
        return +(angle - angleRange < (360 - angleRange) / 2)
    }
};

export const findClosest = (values: number[], value: number): number => {
    let result: number = 1;
    let lastDelta: number;
    values.some(item => {
        const delta = Math.abs(value - item);
        if (delta >= lastDelta) {
            return true;
        }
        result = item;
        lastDelta = delta;
        return false;
    });
    return result;
}

export const getValueFromPercentage = (min: number, max: number, percentage: number): number => {
    return min + (max - min) * percentage;
};

export const getPercentageFromValue = (min: number, max: number, value: number): number => {
    return (value - min) / (max - min);
};

interface StartXY {
    startX: number;
    startY: number;
}

export const getStartXY = (container: RefObject<HTMLElement>, size: number): StartXY => {
    return {
        startX: Math.floor(container.current!.offsetLeft) + (size / 2),
        startY: Math.floor(container.current!.offsetTop) + (size / 2),
    };
};

interface Point {
    x: number;
    y: number;
}

export const pointOnCircle = (center: number, radius: number, angle: number): Point => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
})

export const degToRad = (deg: number): number => (Math.PI * deg) / 180;

export const stepsToSnapTo = (steps: number, snap: boolean): number[] | undefined => {
    if(steps && snap){
        return Array.from({ length: steps + 1 }, (_, i) => (1 / steps) * i);
    }
    return undefined;
}

interface PathData {
    percentage: number,
    angleOffset: number,
    angleRange: number,
    arcWidth: number,
    radius: number,
    center: number,
}
export const calcKnobArcPath = (data: PathData): string => {
    const {
        percentage,
        angleOffset,
        angleRange,
        arcWidth,
        radius,
        center,
    } = data;

    const angleOverflow = degToRad(4);
    const angle = angleRange * percentage;
    const angleRad = degToRad(angle);
    const startAngle = angleOffset - 90;
    const innerRadius = radius - arcWidth;
    const startAngleDegree = degToRad(startAngle) - angleOverflow;
    const endAngleDegree = degToRad(startAngle + angle) + angleOverflow;
    const largeArcFlag = angleRad + angleOverflow * 2 < Math.PI ? 0 : 1;

    const p1 = pointOnCircle(center, radius, endAngleDegree);
    const p2 = pointOnCircle(center, radius, startAngleDegree);
    const p3 = pointOnCircle(center, innerRadius, startAngleDegree - degToRad(1));
    const p4 = pointOnCircle(center, innerRadius, endAngleDegree +  degToRad(1));

    return `
        M${p1.x},${p1.y}
        A${radius},${radius} 0 ${largeArcFlag} 0 ${p2.x},${p2.y}
        L${p3.x},${p3.y}
        A${innerRadius},${innerRadius} 0 ${largeArcFlag} 1 ${p4.x},${p4.y}
        L${p1.x},${p1.y}
    `;
};