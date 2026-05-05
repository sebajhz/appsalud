import type { MapazappApiErrorItem } from "./response";

export const MAPAZAPP_ERROR_ACCOUNT_NOT_FOUND: MapazappApiErrorItem = {
  code: "ACCOUNT_NOT_FOUND",
  message: "Account not found",
};

export const MAPAZAPP_ERROR_ZONE_NOT_FOUND: MapazappApiErrorItem = {
  code: "ZONE_NOT_FOUND",
  message: "Zone not found for this account scope",
};

export const MAPAZAPP_ERROR_PARAMETER_SET_NOT_FOUND: MapazappApiErrorItem = {
  code: "PARAMETER_SET_NOT_FOUND",
  message: "Parameter set not found in registry",
};
