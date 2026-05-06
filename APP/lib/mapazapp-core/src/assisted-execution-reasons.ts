import type { AssistedExecutionBlockingReason, AssistedExecutionWarningReason } from "./assisted-execution-types";

export function assistedExecutionBlock(
  code: string,
  messageSimple: string,
  messageTechnical?: string,
): AssistedExecutionBlockingReason {
  return {
    code,
    messageSimple,
    messageTechnical: messageTechnical ?? code,
  };
}

export function assistedExecutionWarn(
  code: string,
  messageSimple: string,
  messageTechnical?: string,
): AssistedExecutionWarningReason {
  return {
    code,
    messageSimple,
    messageTechnical: messageTechnical ?? code,
  };
}
