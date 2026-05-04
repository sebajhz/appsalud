import type { MappedReason } from "@/services/tradeReviewExplanation";

function severityClass(s: MappedReason["severity"]): string {
  switch (s) {
    case "danger":
      return "text-red-300";
    case "warning":
      return "text-amber-300";
    case "success":
      return "text-emerald-300";
    default:
      return "text-slate-300";
  }
}

export function ReasonCodeList({
  reasons,
  title = "Reason codes",
  dense,
}: {
  reasons: MappedReason[];
  title?: string;
  dense?: boolean;
}) {
  if (reasons.length === 0) {
    return null;
  }
  return (
    <div className={dense ? "space-y-1" : "space-y-2"}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className={`font-mono text-xs space-y-1 ${dense ? "" : "pl-0"}`}>
        {reasons.map((r) => (
          <li key={r.code} className="flex flex-col gap-0.5 border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
            <span className="text-slate-500">
              <span className="text-slate-400">{r.code}</span>
              <span className="text-slate-600"> · {r.category}</span>
            </span>
            <span className={severityClass(r.severity)}>{r.technical}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
