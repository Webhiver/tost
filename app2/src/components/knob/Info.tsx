import {useRef, useEffect} from 'react'
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";

export const Info = () => {
    // TEMP
    const marginTop = 85
    const labelSize = 16;
    const label = "HEATING TO";
    const valueSize = 50;
    const decimalPlace = 1;
    const flameSize = 60;
    const flameOnColor = "#d23d00";
    const flameOffColor = "#aaacb7";
    // TEMP

    const flameOn = useContextSelector(LocalContext, c => c.flame);
    const targetTemp = useContextSelector(LocalContext, c => c.targetTemp);
    const effectiveTemp = useContextSelector(LocalContext, c => c.effectiveTemp);
    const knobSize = useContextSelector(LocalContext, c => c.knobSize);

    const flameAnimation = useRef<SVGAnimateElement>(null);

    useEffect(() => {
        if (flameAnimation.current) {
            flameAnimation.current.beginElement();
        }
    }, [flameOn]);

    return (
        <g transform={`translate(0,${marginTop})`}>
            <text
                x={'50%'}
                y={labelSize}
                textAnchor={'middle'}
                className="fill-amber-600 font-light text-md users-select-none"
            >
                {label}
            </text>

            <text
                x={'50%'}
                y={labelSize + valueSize + 5}
                textAnchor={'middle'}
                className="fill-slate-400 font-mono text-5xl users-select-none"
            >
                {targetTemp.toFixed(decimalPlace)}°C
            </text>

            <g
                transform={`translate(${knobSize / 2 - flameSize / 2},${labelSize + valueSize + 25})`}
            >
                <svg
                    width={flameSize}
                    height={flameSize}
                    viewBox={'0 0 48 48'}
                    fill={flameOn ? flameOnColor : flameOffColor}
                    style={{
                        transition: 'fill 0.2s ease-in-out',
                    }}
                >
                    <path
                        d="M37.69 25.11c-2.91,-7.51 -13.11,-7.93 -10.62,-18.87 0.15,-0.85 -0.69,-1.43 -1.38,-1.01 -6.66,3.91 -11.42,11.84 -7.4,22.2 0.32,0.85 -0.69,1.64 -1.37,1.12 -3.33,-2.54 -3.65,-6.19 -3.39,-8.78 0.11,-0.95 -1.11,-1.43 -1.64,-0.63 -1.26,1.95 -2.53,5.02 -2.53,9.72 0.74,10.31 9.35,13.48 12.47,13.91 4.44,0.58 9.25,-0.27 12.69,-3.49 3.81,-3.54 5.18,-9.2 3.17,-14.17l0 0zm-16.97 9.3c2.65,-0.68 3.97,-2.59 4.34,-4.28 0.63,-2.64 -1.75,-5.23 -0.16,-9.41 0.58,3.49 5.97,5.6 5.97,9.41 0.16,4.65 -4.86,8.67 -10.15,4.28l0 0z"
                    />
                    <polygon
                        stroke={'#fff'}
                        strokeWidth={4}
                        paintOrder={'stroke'}
                        points={!flameOn ? `36.15,8.13 36.15,8.13 39.06,10.94 39.06,10.94` : `5.12,41.07 36.15,8.13 39.06,10.94 8.03,43.78`}
                    >
                        <animate
                            ref={flameAnimation}
                            attributeName={'points'}
                            to={flameOn ? `36.15,8.13 36.15,8.13 39.06,10.94 39.06,10.94` : `5.12,41.07 36.15,8.13 39.06,10.94 8.03,43.78`}
                            dur={'0.2s'}
                            fill={'freeze'}
                        />
                    </polygon>
                </svg>
            </g>

            <text
                x={'50%'}
                y={210}
                textAnchor={'middle'}
                className="fill-amber-600 font-light text-md users-select-none"
            >
                ROOM
            </text>

            <text
                x={'50%'}
                y={230}
                textAnchor={'middle'}
                className="fill-slate-500 font-mono text-lg users-select-none"
            >
                {effectiveTemp.toFixed(decimalPlace)}°C
            </text>
        </g>
    );
}
