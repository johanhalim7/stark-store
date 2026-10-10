export default function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-white px-6 py-16 text-center shadow-sm">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-light text-4xl">
        📦
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-gray-500">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
