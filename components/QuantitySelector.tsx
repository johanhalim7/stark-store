"use client";

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center text-lg text-gray-600 hover:text-primary disabled:opacity-30"
        aria-label="Kurangi"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center text-lg text-gray-600 hover:text-primary disabled:opacity-30"
        aria-label="Tambah"
      >
        +
      </button>
    </div>
  );
}
