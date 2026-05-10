import app from "./app";
import {
  createApiHardeningConfigFromEnv,
  validateApiHardeningConfig,
} from "./config/apiHardeningConfig";
import { logger } from "./lib/logger";

const apiHardeningConfig = createApiHardeningConfigFromEnv(process.env);
const validation = validateApiHardeningConfig(apiHardeningConfig);

if (!validation.ok) {
  logger.error(
    { errors: validation.errors },
    "Invalid API hardening configuration",
  );
  process.exit(1);
}

for (const warning of validation.warnings) {
  logger.warn({ warning }, "API hardening configuration warning");
}

const { host, port } = apiHardeningConfig;

if (host.trim() === "0.0.0.0") {
  logger.warn(
    {},
    "MAPAZAPP_API_HOST=0.0.0.0 binds all interfaces; not recommended for the local mock API",
  );
}

app.listen(port, host, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on host/port");
    process.exit(1);
  }

  logger.info({ host, port }, "Server listening");
});
