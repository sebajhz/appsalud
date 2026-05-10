/**
 * D10.4 — Read-only draft panel; no buttons, no fetch, no MT5 launch.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MT5_CONFIG_STATUS_PANEL_TITLE,
  createMockMt5ConfigStatusViewModel,
  type Mt5ConfigStatusTone,
} from "@/components/mt5ConfigStatusPresenter";

function toneClass(tone: Mt5ConfigStatusTone): string {
  switch (tone) {
    case "warning":
      return "text-amber-300";
    case "muted":
      return "text-slate-400";
    default:
      return "text-slate-200";
  }
}

export function Mt5ConfigStatusPanel() {
  const vm = createMockMt5ConfigStatusViewModel();

  return (
    <Card className="border-slate-800 bg-card" data-testid="mt5-config-status-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-100">{MT5_CONFIG_STATUS_PANEL_TITLE}</CardTitle>
        <CardDescription className="text-xs text-slate-400 leading-relaxed">
          {vm.bullets[0]}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-xs font-medium text-slate-500" data-testid="mt5-config-status-summary-label">
          {vm.summaryLabel}
        </p>
        <dl className="space-y-2">
          {vm.rows.map((row) => (
            <div
              key={row.testId}
              className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0"
            >
              <dt className="text-xs font-medium text-slate-500 shrink-0">{row.label}</dt>
              <dd className={`text-xs font-medium text-right ${toneClass(row.tone)}`} data-testid={row.testId}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400 leading-relaxed">
          {vm.bullets.slice(1).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
