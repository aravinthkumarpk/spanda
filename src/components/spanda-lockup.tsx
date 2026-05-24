// SpandaLockup — the in-app brand mark for spanda.
//
// Replaces FooleryWordmark. The lockup combines the spanda "pearl" mark
// (dark gradient body with two lime eyes — the eternally-alive observer
// per the brand's Sanskrit naming) with the "spanda" wordmark set in
// Manrope 900.
//
// The wordmark text node uses fill="currentColor" so the consumer
// controls colour via Tailwind text-* utilities (text-ink-900 in light,
// text-paper-100 in dark, etc.). The pearl gradient and the lime eyes
// are fixed at their brand values; per DESIGN.md the lime #9fe870 is
// the only accent colour and never themes.
//
// Source SVG: src/design-system/assets/spanda_lockup.svg.

interface SpandaLockupProps {
  className?: string;
  "aria-label"?: string;
}

export function SpandaLockup(props: SpandaLockupProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 620 150"
      role="img"
      aria-label={props["aria-label"] ?? "spanda"}
      className={props.className}
    >
      <g transform="translate(8, 38)">
        <defs>
          <radialGradient id="spandaLockupPearl" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#2a2c28" />
            <stop offset="55%" stopColor="#15170f" />
            <stop offset="100%" stopColor="#0a0b07" />
          </radialGradient>
        </defs>
        <circle cx="38" cy="38" r="34" fill="url(#spandaLockupPearl)" />
        <ellipse cx="27" cy="22" rx="9" ry="5" fill="#fff" opacity="0.08" />
        <rect x="27" y="31" width="6" height="14" rx="3" fill="#9fe870" />
        <rect x="43" y="31" width="6" height="14" rx="3" fill="#9fe870" />
      </g>
      <text
        x="106"
        y="118"
        fontFamily="Manrope, 'Wise Sans', system-ui, sans-serif"
        fontWeight="900"
        fontSize="138"
        letterSpacing="-6"
        fill="currentColor"
      >
        spanda
      </text>
    </svg>
  );
}
