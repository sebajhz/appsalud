/**
 * D6.2.1 — Presentational runtime status panel (no fetch, no routes, no buttons).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuntimeStatusViewModel } from "@/services/runtimeStatusDataSource";
import {
  RUNTIME_STATUS_PANEL_DEFAULT_TITLE,
  RUNTIME_STATUS_PANEL_SUBTITLE,
  buildRuntimeStatusPanelRows,
  getRuntimeStatusPanelSafetyText,
  type RuntimeStatusPanelRowTone,
} from "./runtimeStatusPanelPresenter";

export type RuntimeStatusPanelProps = {
  status: RuntimeStatusViewModel;
  title?: string;
};

function toneTextClass(tone: RuntimeStatusPanelRowTone): string {
  switch (tone) {
    case "danger":
      return "text-rose-300";
    case "warning":
      return "text-amber-300";
    case "muted":
      return "text-slate-400";
    default:
      return "text-slate-200";
  }
}

export function RuntimeStatusPanel({ status, title }: RuntimeStatusPanelProps) {
  const rows = buildRuntimeStatusPanelRows(status);
  const safetyText = getRuntimeStatusPanelSafetyText(status);

  return (
    <Card
      className="border-slate-800 bg-card"
      data-testid="runtime-status-panel"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-slate-100">
          {title ?? RUNTIME_STATUS_PANEL_DEFAULT_TITLE}
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 leading-relaxed">
          {RUNTIME_STATUS_PANEL_SUBTITLE}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <dl className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.testId}
              className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0"
            >
              <dt className="text-xs font-medium text-slate-500 shrink-0">{row.label}</dt>
              <dd
                className={`text-xs font-medium text-right ${toneTextClass(row.tone)}`}
                data-testid={row.testId}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <p
          className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-3"
          data-testid="runtime-status-message"
        >
          {status.message}
        </p>

        <p className="text-[11px] text-slate-500 leading-relaxed">{safetyText}</p>
      </CardContent>
    </Card>
  );
}
