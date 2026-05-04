import type { TradeReviewExplanation } from "@/services/tradeReviewExplanation";

export function TradeReviewExplanationCard({
  explanation,
  variant = "full",
}: {
  explanation: TradeReviewExplanation;
  variant?: "full" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900/40 ${isCompact ? "p-3 space-y-2" : "p-4 space-y-3"}`}
      data-testid="trade-review-explanation-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-xs font-semibold text-slate-300">{explanation.simpleTitle}</h4>
        {explanation.status === "TRADE_READY" && (
          <span className="text-[10px] uppercase tracking-wide text-amber-400/90 border border-amber-800/60 rounded px-1.5 py-0.5">
            Manual review only
          </span>
        )}
      </div>
      <p className={`text-slate-400 ${isCompact ? "text-xs line-clamp-2" : "text-sm"}`}>{explanation.simpleSummary}</p>
      {!isCompact && (
        <>
          <div className="grid gap-2 text-xs">
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-0.5">What it means</p>
              <p className="text-slate-300">{explanation.whatItMeans}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-0.5">What to do now</p>
              <p className="text-slate-300">{explanation.whatToDoNow}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-0.5">Suggested action</p>
              <p className="text-slate-200 font-medium">{explanation.actionLabel}</p>
            </div>
          </div>
          {explanation.missingRequirements.length > 0 && (
            <div>
              <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Missing</p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                {explanation.missingRequirements.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {(explanation.blockingReasons.length > 0 || explanation.positiveReasons.length > 0) && (
            <div className="space-y-2 text-xs border-t border-slate-800 pt-2">
              {explanation.blockingReasons.length > 0 && (
                <div>
                  <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Why not / blockers</p>
                  <ul className="space-y-1">
                    {explanation.blockingReasons.map((b) => (
                      <li key={b.code} className="text-amber-200/90">
                        {b.simple}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.positiveReasons.length > 0 && (
                <div>
                  <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Supporting</p>
                  <ul className="space-y-1">
                    {explanation.positiveReasons.map((p) => (
                      <li key={p.code} className="text-emerald-200/80">
                        {p.simple}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="border-t border-slate-800 pt-2">
            <p className="text-slate-500 uppercase tracking-wide text-[10px] mb-1">Risk / account (this evaluation)</p>
            <p className="text-xs text-slate-400">{explanation.riskSummary}</p>
          </div>
        </>
      )}
    </div>
  );
}
