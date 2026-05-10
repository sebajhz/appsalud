/**
 * D6.3.1 — Loads runtime status once on mount and renders RuntimeStatusPanel (ConfigPage only).
 */

import { useEffect, useState } from "react";
import type { RuntimeStatusViewModel } from "@/services/runtimeStatusDataSource";
import {
  createHttpRuntimeStatusDataSource,
  createUnavailableRuntimeStatusViewModel,
  getRuntimeStatusApiBaseUrlFromEnv,
} from "@/services/runtimeStatusDataSource";
import { RuntimeStatusPanel } from "./RuntimeStatusPanel";

const NOT_LOADED_MSG = "Runtime status has not been loaded yet.";

export function RuntimeStatusPanelContainer() {
  const [status, setStatus] = useState<RuntimeStatusViewModel>(() =>
    createUnavailableRuntimeStatusViewModel(NOT_LOADED_MSG),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const apiBaseUrl = getRuntimeStatusApiBaseUrlFromEnv(
        import.meta.env as Record<string, string | undefined>,
      );
      const ds = createHttpRuntimeStatusDataSource({ apiBaseUrl });
      const vm = await ds.getRuntimeStatus();
      if (!cancelled) {
        setStatus(vm);
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-lg border border-slate-800 bg-card p-4 text-xs text-slate-400"
        data-testid="runtime-status-container-loading"
      >
        Checking runtime status snapshot…
      </div>
    );
  }

  return <RuntimeStatusPanel status={status} />;
}
