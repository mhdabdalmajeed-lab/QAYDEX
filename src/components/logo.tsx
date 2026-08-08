/**
 * The product mark.
 *
 * A circle — the coin, and the bowl of the letterform — crossed by two rules of equal
 * length: debit above, credit below. The lower rule is offset to the right so that its end
 * breaks the ring, which is what turns a circle into a letter.
 *
 * Plate and strokes are `--primary` / `--primary-foreground` rather than baked-in colour.
 * The original mark hard-coded white strokes, which works only while the plate is dark;
 * this theme inverts `--primary` in dark mode, so white-on-white would erase the drawing.
 * Reading both ends of the pair from the theme keeps the contrast the design assumes.
 */
export function LogoMark({
  className = "h-10 w-10",
  /** Pass `null` when the wordmark sits beside the mark, so it is announced once, not twice. */
  label = "QAYDEX",
}: {
  className?: string;
  label?: string | null;
}) {
  const semantics = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg viewBox="0 0 48 48" className={className} {...semantics}>
      <rect width="48" height="48" rx="13" fill="var(--primary)" />
      <circle
        cx="24"
        cy="23"
        r="13"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="3"
      />
      <line
        x1="13"
        y1="18"
        x2="30"
        y2="18"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <line
        x1="25"
        y1="28"
        x2="42"
        y2="28"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
