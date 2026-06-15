/**
 * Abstract clinic atmosphere: tall arched windows in a quiet waiting room, light falling across
 * the floor in hard-edged shafts. Pure SVG so it scales to any viewport with no asset to ship.
 */
export function ClinicAtmosphere() {
  const arches = [
    { x: 700, w: 210 },
    { x: 960, w: 210 },
    { x: 1220, w: 210 },
  ];
  const wallBottom = 690;
  const archTop = 110;
  const floorLines = [-600, -200, 200, 600, 1000, 1400, 1800, 2200, 2600];

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#082220" />
          <stop offset="1" stopColor="#134743" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfc6b1" />
          <stop offset="1" stopColor="#e6e1d5" />
        </linearGradient>
        <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9ddd5" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d4eeea" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#082220" stopOpacity="0.92" />
          <stop offset="0.5" stopColor="#082220" stopOpacity="0.68" />
          <stop offset="1" stopColor="#082220" stopOpacity="0" />
        </linearGradient>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.06" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width="1600" height={wallBottom} fill="url(#wall)" />
      {/* wainscot rail */}
      <rect y="520" width="1600" height="6" fill="#0d3330" />
      <rect y="526" width="1600" height={wallBottom - 526} fill="#0d3330" opacity="0.55" />

      {arches.map(({ x, w }) => (
        <g key={x}>
          <path
            d={`M${x} ${wallBottom} V${archTop + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${archTop + w / 2} V${wallBottom} Z`}
            fill="#0d3330"
          />
          <path
            d={`M${x + 14} ${wallBottom} V${archTop + w / 2} A${w / 2 - 14} ${w / 2 - 14} 0 0 1 ${x + w - 14} ${archTop + w / 2} V${wallBottom} Z`}
            fill="url(#pane)"
          />
          <g stroke="#0d3330" strokeWidth="5" opacity="0.75">
            <path d={`M${x + w / 2} ${archTop + 14} V${wallBottom}`} />
            <path d={`M${x + 14} ${archTop + w / 2 + 40} H${x + w - 14}`} />
            <path d={`M${x + 14} ${archTop + w / 2 + 230} H${x + w - 14}`} />
          </g>
        </g>
      ))}

      {/* floor */}
      <rect y={wallBottom} width="1600" height={900 - wallBottom} fill="url(#floor)" />
      <rect y={wallBottom} width="1600" height="4" fill="#082220" opacity="0.5" />
      <g stroke="#0f1716" strokeOpacity="0.1" strokeWidth="1.5">
        {floorLines.map((x) => (
          <path key={x} d={`M1070 ${wallBottom} L${x} 900`} />
        ))}
        <path d={`M0 ${wallBottom + 38} H1600`} />
        <path d={`M0 ${wallBottom + 100} H1600`} />
      </g>

      {/* hard-edged light shafts cast by the windows */}
      {arches.map(({ x, w }, i) => (
        <polygon
          key={`shaft-${x}`}
          points={`${x},${wallBottom} ${x + w},${wallBottom} ${x + w - 560 - i * 40},900 ${x - 560 - i * 40},900`}
          fill="#ffffff"
          opacity="0.14"
        />
      ))}

      {/* reception desk */}
      <g>
        <rect x="1180" y="600" width="330" height="90" fill="#08302f" />
        <rect x="1170" y="590" width="350" height="14" fill="#e6e1d5" />
        <rect x="1200" y="620" width="290" height="3" fill="#175a55" />
      </g>

      <rect width="1600" height="900" fill="url(#scrim)" />
      <rect width="1600" height="900" filter="url(#grain)" />
    </svg>
  );
}
