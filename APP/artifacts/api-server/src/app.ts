import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createApiHardeningConfigFromEnv } from "./config/apiHardeningConfig";
import { createCorsOptions } from "./config/apiCorsConfig";
import router from "./routes";
import { logger } from "./lib/logger";
import { safeErrorHandler } from "./middleware/safeErrorHandler";

const app: Express = express();

const apiHardeningConfig = createApiHardeningConfigFromEnv(
  process.env as Record<string, string | undefined>,
);
const bodyLimitBytes = apiHardeningConfig.maxBodyBytes;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(createCorsOptions(apiHardeningConfig)));
app.use(express.json({ limit: bodyLimitBytes }));
app.use(express.urlencoded({ extended: true, limit: bodyLimitBytes }));

app.use("/api", router);

app.use(safeErrorHandler);

export default app;
