export default function AviationBg() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.035 }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Radar rings centered in viewport */}
      {[100, 200, 300, 400, 520, 640].map((r) => (
        <circle
          key={r}
          cx="50%" cy="50%" r={r}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="0.7"
        />
      ))}

      {/* Crosshair lines */}
      <line
        x1="50%" y1="0" x2="50%" y2="100%"
        stroke="#06b6d4" strokeWidth="0.4" strokeDasharray="6 10"
      />
      <line
        x1="0" y1="50%" x2="100%" y2="50%"
        stroke="#06b6d4" strokeWidth="0.4" strokeDasharray="6 10"
      />

      {/* Center */}
      <circle cx="50%" cy="50%" r="4" fill="#06b6d4" fillOpacity="0.5" />
      <circle cx="50%" cy="50%" r="8" fill="none" stroke="#06b6d4" strokeWidth="0.7" />
    </svg>
  )
}
