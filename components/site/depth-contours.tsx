/**
 * Dieptelijnen zoals op een zeekaart: de achtergrond van de hero.
 * Met de hand getekende, licht onregelmatige lussen rond een "diep punt".
 */
export function DepthContours({ className }: { className?: string }) {
  const rings = [
    "M820 300c40-118 196-150 282-62 74 76 46 210-60 246-118 40-262-52-222-184z",
    "M760 300c34-170 262-226 386-96 104 110 64 300-92 352-170 56-332-88-294-256z",
    "M690 296c26-226 336-306 506-130 140 146 88 400-124 466-226 70-412-112-382-336z",
    "M610 290c20-286 420-392 640-166 180 186 112 506-158 590-288 88-506-140-482-424z",
    "M520 282c14-350 512-486 784-206 222 228 140 618-196 720-354 108-614-170-588-514z",
    "M420 270c8-420 614-590 942-252 266 274 168 744-236 868-428 130-736-206-706-616z",
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
      stroke="var(--color-line-strong)"
      strokeWidth="1"
    >
      {rings.map((d, i) => (
        <path key={d} d={d} strokeOpacity={0.9 - i * 0.12} strokeDasharray={i === 2 ? "4 6" : undefined} />
      ))}
      <g fill="var(--color-ink-3)" fontFamily="var(--font-geist-mono)" fontSize="11">
        <text x="1090" y="250">−40</text>
        <text x="1168" y="168">−30</text>
        <text x="1262" y="96">−20</text>
      </g>
    </svg>
  );
}
