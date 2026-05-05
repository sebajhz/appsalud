import { getCheckpoint8MockApprovalForParameterSet } from "@workspace/mapazapp-core";
import { MAPAZAPP_MOCK_BACKTESTS } from "../mockData";

export function listBacktests() {
  return MAPAZAPP_MOCK_BACKTESTS;
}

export function advisoryForParameterSet(parameterSetId: string) {
  return getCheckpoint8MockApprovalForParameterSet(parameterSetId);
}
