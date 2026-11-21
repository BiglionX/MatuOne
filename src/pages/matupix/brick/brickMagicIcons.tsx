import { useId } from 'react'

const INK = '#1A1D24'

function paint(fill: string, strokeWidth = 2.2) {
  return {
    fill,
    stroke: INK,
    strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  }
}

function Wheel({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx} cy={cy} r={r * 0.42} fill="#E4E7EC" />
    </g>
  )
}

export function MagicGlyph({ id }: { id: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" className="block h-auto w-[52%] min-w-0 shrink-0" aria-hidden="true">
      {renderGlyph(id, uid)}
    </svg>
  )
}

function renderGlyph(id: string, uid: string) {
  if (id === 'f1') return <TrafficGlyph />
  if (id === 'fire-engine' || id === 'fire-station') return <FireGlyph />
  if (id === 'plane') return <PlaneGlyph />
  if (id === 'rocket') return <RocketGlyph />
  if (id === 'castle' || id === 'big-castle') return <CastleGlyph />
  if (id === 'house') return <HouseGlyph />
  if (id === 'robot') return <RobotGlyph />
  if (id === 'heli') return <HeliGlyph />
  if (id === 'tree') return <TreeGlyph />
  if (id === 'train') return <TrainGlyph />
  if (id === 'crane') return <CraneGlyph />
  if (id === 'boat') return <BoatGlyph />
  if (id === 'tractor') return <TractorGlyph />
  if (id === 'lighthouse') return <LanternGlyph uid={uid} />
  if (id === 'dino') return <DinoGlyph />
  if (id === 'village') return <VillageGlyph />
  if (id === 'race') return <FlagGlyph uid={uid} />
  if (id === 'site') return <BarrierGlyph uid={uid} />
  if (id === 'port') return <AnchorGlyph />
  if (id === 'station') return <StationGlyph />
  if (id === 'dino-park') return <BrontoGlyph />
  if (id === 'farm') return <CornGlyph />
  if (id === 'airport') return <AirportGlyph />
  if (id === 'space') return <SatelliteGlyph />
  if (id === 'stadium') return <StadiumGlyph />
  if (id === 'sport') return <SportGlyph />
  if (id === 'eiffel') return <EiffelGlyph />
  if (id === 'skyscraper') return <TempleGlyph />
  return <TrafficGlyph />
}

function TrafficGlyph() {
  return (
    <g>
      <rect x="4" y="20" width="56" height="24" rx="12" {...paint('#2C3138', 2.4)} />
      <path d="M14 23h36" stroke="#4A515A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="32" r="6.2" fill="#3DDC4A" />
      <circle cx="32" cy="32" r="6.2" fill="#F5C518" />
      <circle cx="46" cy="32" r="6.2" fill="#E23B3B" />
      <circle cx="16.2" cy="30" r="1.7" fill="#fff" opacity="0.9" />
      <circle cx="30.2" cy="30" r="1.7" fill="#fff" opacity="0.9" />
      <circle cx="44.2" cy="30" r="1.7" fill="#fff" opacity="0.9" />
    </g>
  )
}

function FireGlyph() {
  return (
    <g>
      <rect x="26" y="13" width="28" height="7" rx="1.4" {...paint('#F2F4F7', 1.8)} />
      <path d="M26 16.5h24M30 13.5v6M38 13.5v6M46 13.5v6" stroke="#8E969E" strokeWidth="1.2" />
      <path d="M6 30h14v-8h6v-2h28v20H6Z" {...paint('#E23B3B')} />
      <rect x="9" y="24" width="10" height="8" rx="1.2" fill="#7EC8F0" stroke={INK} strokeWidth="1.5" />
      <rect x="8" y="36" width="42" height="3.2" fill="#F7F8FA" />
      <rect x="5" y="31" width="3.2" height="4" rx="0.6" fill="#F5C518" />
      <Wheel cx={16} cy={46} />
      <Wheel cx={44} cy={46} />
    </g>
  )
}

function PlaneGlyph() {
  return (
    <g transform="rotate(-36 34 34)">
      <path d="M4 34 28 30 26 16 36 28 58 23 61 30 38 35 42 50 33 45 29 36 12 43Z" {...paint('#3A96DD')} />
      <path d="M12 32 52 26 55 32 14 37Z" fill="#F7FBFF" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="46" cy="29.5" r="1.7" fill="#2F6FED" />
    </g>
  )
}

function RocketGlyph() {
  return (
    <g transform="rotate(40 32 34)">
      <path d="M27 46 22 58 32 51 42 58 37 46Z" {...paint('#F08A1A')} />
      <path d="M25 16h14l2 30H23Z" {...paint('#F7F8FA')} />
      <path d="M25 16 32 3 39 16Z" {...paint('#E23B3B')} />
      <path d="M23 32 12 48 26 42Z" {...paint('#3A96DD')} />
      <path d="M41 32 52 48 38 42Z" {...paint('#3A96DD')} />
      <circle cx="32" cy="28" r="5" {...paint('#C5CDD4', 1.6)} />
    </g>
  )
}

function CastleGlyph() {
  return (
    <g>
      <path d="M6 32 16 16 26 32v22H6Z" {...paint('#F7F8FA')} />
      <path d="M22 28 32 8 42 28v26H22Z" {...paint('#F7F8FA')} />
      <path d="M38 32 48 16 58 32v22H38Z" {...paint('#F7F8FA')} />
      <path d="M6 32 16 16 26 32Z" {...paint('#E23B3B')} />
      <path d="M22 28 32 8 42 28Z" {...paint('#E23B3B')} />
      <path d="M38 32 48 16 58 32Z" {...paint('#E23B3B')} />
      <circle cx="16" cy="15" r="2.1" fill="#3A96DD" />
      <circle cx="32" cy="7" r="2.2" fill="#3A96DD" />
      <circle cx="48" cy="15" r="2.1" fill="#3A96DD" />
      <rect x="13" y="36" width="5" height="6" rx="0.6" fill="#7EC8F0" />
      <rect x="29.5" y="34" width="5" height="6" rx="0.6" fill="#7EC8F0" />
      <rect x="46" y="36" width="5" height="6" rx="0.6" fill="#7EC8F0" />
      <path d="M28 44h8v10h-8Z" fill="#C47A3A" stroke={INK} strokeWidth="1.4" />
    </g>
  )
}

function HouseGlyph() {
  return (
    <g>
      <circle cx="14" cy="34" r="10" {...paint('#3CB54A')} />
      <rect x="12" y="40" width="4.5" height="10" rx="1" fill="#8A5A2B" />
      <rect x="24" y="30" width="30" height="22" {...paint('#F7F8FA')} />
      <path d="M20 32 39 14 58 32Z" {...paint('#E23B3B')} />
      <rect x="28" y="36" width="7" height="7" rx="1" fill="#7EC8F0" stroke={INK} strokeWidth="1.2" />
      <rect x="42" y="36" width="7" height="7" rx="1" fill="#7EC8F0" stroke={INK} strokeWidth="1.2" />
      <rect x="35" y="40" width="8" height="12" fill="#E23B3B" stroke={INK} strokeWidth="1.3" />
      <ellipse cx="30" cy="52" rx="6" ry="2.6" fill="#2E9A3C" />
      <ellipse cx="50" cy="52" rx="5" ry="2.4" fill="#2E9A3C" />
    </g>
  )
}

function RobotGlyph() {
  return (
    <g>
      <rect x="8" y="20" width="8" height="16" rx="3" {...paint('#C5CAD1')} />
      <rect x="48" y="20" width="8" height="16" rx="3" {...paint('#C5CAD1')} />
      <rect x="14" y="12" width="36" height="38" rx="14" {...paint('#E4E7EC')} />
      <rect x="29" y="14" width="6" height="16" rx="2" fill="#E23B3B" />
      <rect x="20" y="28" width="8" height="11" rx="2" fill="#3EC6E0" />
      <rect x="36" y="28" width="8" height="11" rx="2" fill="#3EC6E0" />
      <rect x="26" y="43" width="12" height="3" rx="1.5" fill="#6E7780" />
    </g>
  )
}

function HeliGlyph() {
  return (
    <g>
      <rect x="6" y="12" width="52" height="5" rx="2.5" fill={INK} />
      <rect x="30" y="17" width="4" height="7" fill={INK} />
      <path d="M10 30h26c3 0 5 1 8 4h12v8H22c-8 0-12-4-12-9v-3Z" {...paint('#F5C518')} />
      <path d="M14 32h12v9H18c-3 0-4-2-4-5Z" fill="#7ED3F0" stroke={INK} strokeWidth="1.4" />
      <rect x="18" y="44" width="3" height="6" fill={INK} />
      <rect x="40" y="42" width="3" height="8" fill={INK} />
      <rect x="8" y="49" width="26" height="3.2" rx="1.6" fill={INK} />
      <rect x="34" y="49" width="20" height="3.2" rx="1.6" fill={INK} />
    </g>
  )
}

function TreeGlyph() {
  return (
    <g>
      <circle cx="32" cy="26" r="16" {...paint('#3CB54A')} />
      <circle cx="24" cy="24" r="3.2" fill="#1E8A32" />
      <circle cx="34" cy="18" r="2.6" fill="#1E8A32" />
      <circle cx="38" cy="28" r="2.8" fill="#1E8A32" />
      <rect x="27" y="40" width="10" height="14" rx="2" fill="#C47A3A" stroke={INK} strokeWidth="1.8" />
    </g>
  )
}

function TrainGlyph() {
  return (
    <g>
      <rect x="8" y="26" width="26" height="16" rx="8" {...paint('#8E969E')} />
      <rect x="32" y="20" width="24" height="22" rx="2" {...paint('#E23B3B')} />
      <rect x="12" y="32" width="18" height="3.2" rx="1" fill="#F5C518" />
      <rect x="36" y="24" width="7" height="8" rx="1" fill="#7EC8F0" stroke={INK} strokeWidth="1.2" />
      <rect x="46" y="24" width="6" height="8" rx="1" fill="#7EC8F0" stroke={INK} strokeWidth="1.2" />
      <rect x="20" y="16" width="6" height="12" rx="1" {...paint('#5C656E', 1.6)} />
      <Wheel cx={16} cy={46} r={5.5} />
      <Wheel cx={28} cy={46} r={5.5} />
      <Wheel cx={44} cy={46} r={5.5} />
    </g>
  )
}

function CraneGlyph() {
  return (
    <g>
      <rect x="12" y="16" width="12" height="38" {...paint('#F5C518')} />
      <path d="M14 22h8M14 30h8M14 38h8M16 18l6 8M22 26 16 34M16 34l6 8" stroke={INK} strokeWidth="1.3" />
      <rect x="12" y="12" width="40" height="6" {...paint('#F5C518')} />
      <path d="M46 18v12" stroke={INK} strokeWidth="1.6" />
      <rect x="36" y="30" width="16" height="14" rx="1" {...paint('#E23B3B')} />
      <rect x="39" y="33" width="4" height="4" fill="#7EC8F0" />
      <rect x="46" y="33" width="4" height="4" fill="#7EC8F0" />
    </g>
  )
}

function BoatGlyph() {
  return (
    <g>
      <path d="M8 36h48l-7 12H15Z" {...paint('#C47A3A')} />
      <path d="M12 42h40v3H14Z" fill="#3A96DD" />
      <path d="M32 36V12" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32 14 50 36H32Z" {...paint('#F5C518')} />
    </g>
  )
}

function TractorGlyph() {
  return (
    <g>
      <circle cx="18" cy="44" r="12" fill={INK} />
      <circle cx="18" cy="44" r="5" fill="#F5C518" />
      <circle cx="48" cy="46" r="7" fill={INK} />
      <circle cx="48" cy="46" r="3" fill="#F5C518" />
      <path d="M14 34h20v8H28l-2 4H16Z" {...paint('#2E9A3C')} />
      <path d="M30 22h14v14H30Z" {...paint('#2E9A3C')} />
      <rect x="33" y="25" width="8" height="6" rx="1" fill="#7EC8F0" stroke={INK} strokeWidth="1.2" />
    </g>
  )
}

function LanternGlyph({ uid }: { uid: string }) {
  const clip = `lantern-${uid}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d="M18 20c-2 6-2 14 0 22h28c2-8 2-16 0-22Z" />
        </clipPath>
      </defs>
      <rect x="20" y="8" width="24" height="8" rx="2.5" fill={INK} />
      <path d="M16 22c-2 6-2 14 1 22h30c3-8 3-16 1-22-2-4-6-6-16-6s-14 2-16 6Z" {...paint('#E23B3B')} />
      <g clipPath={`url(#${clip})`}>
        <path d="M16 26h32M16 32h32M16 38h32" stroke="#9E1C24" strokeWidth="2" />
      </g>
      <rect x="20" y="48" width="24" height="8" rx="2.5" fill={INK} />
    </g>
  )
}

function DinoGlyph() {
  return (
    <g>
      <path d="M42 32c10 2 16 8 14 12-6 2-12-2-16-5" {...paint('#C4894A')} />
      <ellipse cx="34" cy="36" rx="13" ry="11" {...paint('#C4894A')} />
      <ellipse cx="32" cy="40" rx="8" ry="6" fill="#F3D7B5" />
      <path d="M24 30c0-8-6-12-12-9-3 1-4 5-1 7l4-1 1 5 8-2Z" {...paint('#C4894A')} />
      <circle cx="15" cy="23" r="1.5" fill={INK} />
      <path d="M22 34 15 40" stroke="#8A5A2B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26 44v9h7l-1-9Z" {...paint('#C4894A', 1.7)} />
      <path d="M38 45v8h6l-1-8Z" {...paint('#C4894A', 1.7)} />
    </g>
  )
}

function VillageGlyph() {
  return (
    <g>
      <ellipse cx="32" cy="53" rx="24" ry="4.5" fill="#2E9A3C" />
      <rect x="8" y="32" width="24" height="18" {...paint('#F7F8FA')} />
      <path d="M4 34 20 16 36 34Z" {...paint('#E23B3B')} />
      <rect x="12" y="36" width="5" height="5" fill="#7EC8F0" />
      <rect x="22" y="36" width="5" height="5" fill="#7EC8F0" />
      <rect x="17" y="42" width="6" height="8" fill="#E23B3B" />
      <rect x="36" y="36" width="20" height="14" {...paint('#F7F8FA')} />
      <path d="M32 38 46 24 60 38Z" {...paint('#E23B3B')} />
      <rect x="40" y="40" width="4.5" height="4.5" fill="#7EC8F0" />
      <rect x="48" y="40" width="4.5" height="4.5" fill="#7EC8F0" />
      <rect x="44" y="44" width="5" height="6" fill="#E23B3B" />
    </g>
  )
}

function FlagGlyph({ uid }: { uid: string }) {
  const pat = `chk-${uid}`
  return (
    <g>
      <defs>
        <pattern id={pat} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#fff" />
          <rect width="4" height="4" fill={INK} />
          <rect x="4" y="4" width="4" height="4" fill={INK} />
        </pattern>
      </defs>
      <path d="M16 10v46" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="16" cy="9" r="3.4" fill={INK} />
      <path
        d="M18 14c8-5 12 4 22 1 7-2 12 1 14 3l-3 18c-7 4-12-3-20 0-7 3-11-1-13-1Z"
        fill={`url(#${pat})`}
        stroke={INK}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </g>
  )
}

function BarrierGlyph({ uid }: { uid: string }) {
  const clip = `bar-${uid}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x="6" y="16" width="52" height="20" rx="2" />
        </clipPath>
      </defs>
      <rect x="14" y="36" width="7" height="16" rx="1.2" {...paint('#8E969E', 1.8)} />
      <rect x="43" y="36" width="7" height="16" rx="1.2" {...paint('#8E969E', 1.8)} />
      <rect x="6" y="16" width="52" height="20" rx="2" fill="#F5C518" />
      <g clipPath={`url(#${clip})`}>
        <path d="M-2 16h10L-4 36H-14Z" fill={INK} />
        <path d="M14 16h10L2 36h-10Z" fill={INK} />
        <path d="M30 16h10L18 36H8Z" fill={INK} />
        <path d="M46 16h10L34 36H24Z" fill={INK} />
        <path d="M62 16h10L50 36H40Z" fill={INK} />
      </g>
      <rect x="6" y="16" width="52" height="20" rx="2" fill="none" stroke={INK} strokeWidth="2.2" />
      <circle cx="14" cy="14" r="3.3" fill="#E23B3B" stroke={INK} strokeWidth="1.4" />
      <circle cx="50" cy="14" r="3.3" fill="#E23B3B" stroke={INK} strokeWidth="1.4" />
    </g>
  )
}

function AnchorGlyph() {
  return (
    <g>
      <circle cx="32" cy="13" r="6" {...paint('#E6E8EC', 3)} />
      <path d="M32 19v30" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M20 28h24" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 38c0 10 8 14 18 14s18-4 18-14" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 38 9 31M50 38l5-7" stroke={INK} strokeWidth="4.2" strokeLinecap="round" />
    </g>
  )
}

function StationGlyph() {
  return (
    <g>
      <path d="M6 46V30c0-10 8-18 18-18s18 8 18 18v16H6Z" fill="#2C3138" />
      <rect x="12" y="24" width="24" height="20" rx="7" {...paint('#8E969E', 1.7)} />
      <rect x="16" y="27" width="16" height="11" rx="4" fill="#5EC8F0" />
      <rect x="12" y="40" width="24" height="5" fill="#2E9A3C" />
      <path d="M8 50h36" stroke="#6E7780" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 50v5M20 50v5M28 50v5M36 50v5" stroke="#6E7780" strokeWidth="2" strokeLinecap="round" />
      <rect x="50" y="20" width="3.2" height="30" rx="1" fill="#5C656E" />
      <rect x="46" y="14" width="12" height="8" rx="1.4" fill="#2C3138" />
      <circle cx="50" cy="18" r="1.7" fill="#E23B3B" />
      <circle cx="55" cy="18" r="1.7" fill="#3CB54A" />
    </g>
  )
}

function BrontoGlyph() {
  return (
    <g>
      <path d="M46 38c8 1 14 5 12 9-5 2-12-1-15-4" {...paint('#B7C0C8')} />
      <ellipse cx="36" cy="40" rx="16" ry="11" {...paint('#B7C0C8')} />
      <path d="M26 36c-1-8 1-16 6-24 3-3 7-1 6 3-1 8-4 16-6 22" {...paint('#B7C0C8')} />
      <ellipse cx="36" cy="12" rx="7" ry="4.5" {...paint('#B7C0C8')} />
      <circle cx="40" cy="11" r="1.4" fill={INK} />
      <rect x="22" y="46" width="6" height="10" rx="2" fill="#B7C0C8" stroke={INK} strokeWidth="1.7" />
      <rect x="32" y="48" width="6" height="8" rx="2" fill="#B7C0C8" stroke={INK} strokeWidth="1.7" />
      <rect x="44" y="46" width="6" height="10" rx="2" fill="#B7C0C8" stroke={INK} strokeWidth="1.7" />
    </g>
  )
}

function CornGlyph() {
  return (
    <g>
      <g transform="rotate(-24 24 36)">
        <path d="M18 34c1 12 4 20 6 22 3-8 7-16 7-24-2-2-8-2-13 2Z" {...paint('#2E9A3C')} />
        <ellipse cx="24" cy="26" rx="6" ry="14" {...paint('#F5C518')} />
        <path d="M24 16v20M21 18v16M27 18v16" stroke="#E2A31A" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      <g transform="rotate(22 42 34)">
        <path d="M36 30c1 14 5 22 7 24 3-8 8-18 8-26-2-2-10-2-15 2Z" {...paint('#2E9A3C')} />
        <ellipse cx="42" cy="24" rx="6.2" ry="15" {...paint('#F0B429')} />
        <path d="M42 12v22M39 15v18M45 15v18" stroke="#E2A31A" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </g>
  )
}

function AirportGlyph() {
  return (
    <g>
      <ellipse cx="22" cy="38" rx="14" ry="10" {...paint('#fff')} />
      <ellipse cx="42" cy="28" rx="16" ry="11" {...paint('#fff')} />
      <ellipse cx="36" cy="42" rx="13" ry="8" {...paint('#fff')} />
      <g transform="rotate(-28 34 34)">
        <path d="M8 34h28l8-6 3 5-16 4 4 10h-7l-3-10H16Z" {...paint('#3A96DD')} />
        <path d="M18 32h28l2 4H20Z" fill="#F7FBFF" />
      </g>
    </g>
  )
}

function SatelliteGlyph() {
  return (
    <g transform="rotate(-42 32 32)">
      <rect x="4" y="22" width="16" height="20" rx="1.5" {...paint('#3A96DD')} />
      <rect x="44" y="22" width="16" height="20" rx="1.5" {...paint('#3A96DD')} />
      <path d="M4 28h16M4 34h16M9 22v20M15 22v20M44 28h16M44 34h16M49 22v20M55 22v20" stroke="#E8F4FF" strokeWidth="1.3" />
      <rect x="20" y="26" width="24" height="12" rx="6" {...paint('#F4F7FA')} />
      <rect x="28" y="29" width="8" height="5" rx="1" fill="#E2B23A" />
    </g>
  )
}

function StadiumGlyph() {
  return (
    <g>
      <rect x="12" y="10" width="40" height="12" rx="2" {...paint('#2C3138')} />
      <rect x="18" y="14" width="6" height="4" rx="0.6" fill="#F5C518" />
      <rect x="29" y="14" width="6" height="4" rx="0.6" fill="#F5C518" />
      <rect x="40" y="14" width="6" height="4" rx="0.6" fill="#F5C518" />
      <rect x="8" y="22" width="48" height="32" rx="2" {...paint('#E6E8EC')} />
      <circle cx="16" cy="30" r="2.1" fill="#3EC6E0" />
      <circle cx="24" cy="30" r="2.1" fill="#3EC6E0" />
      <circle cx="40" cy="30" r="2.1" fill="#3EC6E0" />
      <circle cx="48" cy="30" r="2.1" fill="#3EC6E0" />
      <rect x="18" y="35" width="28" height="4" rx="1" fill="#E23B3B" />
      <path d="M22 54V44h20v10H22Z" fill="#2C3138" />
      <path d="M22 44c0-8 20-8 20 0" fill="#2C3138" />
    </g>
  )
}

function SportGlyph() {
  return (
    <g>
      <path d="M6 38h12l6-10h16l8 6h10v8H6Z" {...paint('#F7F8FA')} />
      <path d="M14 36h30v5H16Z" fill="#F08A1A" />
      <path d="M8 34h10l3-6h6l-2 8H8Z" {...paint('#E23B3B', 1.6)} />
      <rect x="50" y="28" width="4" height="8" rx="0.6" fill={INK} />
      <circle cx="28" cy="30" r="3.2" fill="#E23B3B" stroke={INK} strokeWidth="1.2" />
      <Wheel cx={20} cy={46} />
      <Wheel cx={46} cy={46} />
    </g>
  )
}

function EiffelGlyph() {
  return (
    <g>
      <path d="M32 4 56 58H8Z" {...paint('#E23B3B')} />
      <path d="M32 22 46 58H18Z" fill="#F7F8FA" />
      <rect x="14" y="32" width="36" height="7" fill="#F7F8FA" />
      <rect x="27" y="6" width="10" height="8" fill="#F7F8FA" />
    </g>
  )
}

function TempleGlyph() {
  return (
    <g>
      <path d="M6 26 32 8 58 26H6Z" {...paint('#E6E8EC')} />
      <rect x="8" y="26" width="48" height="6" {...paint('#D5D8DE')} />
      <rect x="12" y="32" width="7" height="20" {...paint('#F4F6F8', 1.8)} />
      <rect x="23" y="32" width="7" height="20" {...paint('#F4F6F8', 1.8)} />
      <rect x="34" y="32" width="7" height="20" {...paint('#F4F6F8', 1.8)} />
      <rect x="45" y="32" width="7" height="20" {...paint('#F4F6F8', 1.8)} />
      <path d="M26 52V40h12v12H26Z" fill="#2C3138" />
      <rect x="8" y="52" width="48" height="4" {...paint('#D5D8DE', 1.6)} />
    </g>
  )
}
