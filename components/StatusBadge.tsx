import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/format";

export default function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABEL[status] ?? status;
  const color = ORDER_STATUS_COLOR[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}
