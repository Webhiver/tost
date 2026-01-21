interface WifiIconProps {
  strength: number | null | undefined
  className?: string
}

export function WifiIcon({ strength, className = 'w-5 h-5' }: WifiIconProps) {
  const level = strength ?? 0
  
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Outer arc - level 4 */}
      <path 
        d="M1.5 9a18.5 18.5 0 0 1 21 0" 
        className={level >= 4 ? 'opacity-90' : 'opacity-20'}
      />
      {/* Middle-outer arc - level 3 */}
      <path 
        d="M5 12.5a12.5 12.5 0 0 1 14 0" 
        className={level >= 3 ? 'opacity-90' : 'opacity-20'}
      />
      {/* Middle-inner arc - level 2 */}
      <path 
        d="M8.5 16a6.5 6.5 0 0 1 7 0" 
        className={level >= 2 ? 'opacity-90' : 'opacity-20'}
      />
      {/* Center dot - level 1 */}
      <circle 
        cx="12" 
        cy="20" 
        r="1.5" 
        fill="currentColor" 
        stroke="none"
        className={level >= 1 ? 'opacity-90' : 'opacity-20'}
      />
    </svg>
  )
}
