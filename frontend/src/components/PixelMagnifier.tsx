export default function PixelMagnifier({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* Lens ring */}
      <rect x="4" y="1" width="4" height="1" fill="#999" />
      <rect x="3" y="2" width="1" height="1" fill="#999" />
      <rect x="8" y="2" width="1" height="1" fill="#999" />
      <rect x="2" y="3" width="1" height="3" fill="#999" />
      <rect x="9" y="3" width="1" height="3" fill="#999" />
      <rect x="3" y="6" width="1" height="1" fill="#999" />
      <rect x="8" y="6" width="1" height="1" fill="#999" />
      <rect x="4" y="7" width="4" height="1" fill="#999" />
      {/* Lens glass */}
      <rect x="4" y="2" width="4" height="1" fill="#6688aa" />
      <rect x="3" y="3" width="6" height="3" fill="#6688aa" />
      <rect x="4" y="6" width="4" height="1" fill="#6688aa" />
      {/* Glass highlight */}
      <rect x="4" y="3" width="2" height="1" fill="#88aacc" />
      <rect x="3" y="4" width="1" height="1" fill="#88aacc" />
      {/* Handle */}
      <rect x="9" y="7" width="1" height="1" fill="#777" />
      <rect x="10" y="8" width="2" height="2" fill="#8a7050" />
      <rect x="12" y="10" width="2" height="2" fill="#8a7050" />
      <rect x="13" y="12" width="2" height="2" fill="#8a7050" />
      {/* Handle highlight */}
      <rect x="10" y="8" width="1" height="1" fill="#a08868" />
      <rect x="12" y="10" width="1" height="1" fill="#a08868" />
    </svg>
  );
}
