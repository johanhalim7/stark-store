/**
 * Tampilkan rating 1–5. Mendukung setengah bintang via overlay.
 */
export default function Stars({
  value,
  size = "text-sm",
  className = "",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`Rating ${v} dari 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, v - (i - 1))); // 0..1
        return (
          <span key={i} className={`relative inline-block leading-none ${size}`}>
            <span className="text-gray-300">★</span>
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fill * 100}%` }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
