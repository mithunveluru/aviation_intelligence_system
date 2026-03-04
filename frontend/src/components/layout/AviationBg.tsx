export default function AviationBg() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none opacity-[0.03] z-0"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="rgCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Radar rings */}
      {[80,160,240,320,400,480].map((r) => (
        <circle key={r} cx="50%" cy="50%" r={r}
          fill="none" stroke="#06b6d4" strokeWidth="0.8" />
      ))}
      {/* Crosshairs */}
      <line x1="50%" y1="0" x2="50%" y2="100%"
        stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 8" />
      <line x1="0" y1="50%" x2="100%" y2="50%"
        stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 8" />
      {/* Runway lines bottom-right */}
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={i}
          x1={`${72 + i * 2}%`} y1="85%"
          x2={`${74 + i * 2}%`} y2="100%"
          stroke="#06b6d4" strokeWidth="0.8" />
      ))}
      {/* Center dot */}
      <circle cx="50%" cy="50%" r="3" fill="#06b6d4" opacity="0.6" />
      <circle cx="50%" cy="50%" r="6" fill="none" stroke="#06b6d4" strokeWidth="0.8" />
    </svg>
  )
}
