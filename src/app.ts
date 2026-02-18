import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { getTelemetryStoreType, initializeTelemetryStore } from "./repositories/telemetry.Store.js";
import { apiRouter } from "./routes/api.routes.js";
import { startMqttIngestion } from "./services/mqttIngestion.service.js";

export const createApp = () => {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  return app;
};

export const startServer = async (): Promise<void> => {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3000);

  await initializeTelemetryStore();
  // eslint-disable-next-line no-console
  console.log(`Telemetry store initialized: ${getTelemetryStoreType()}`);
  await startMqttIngestion();

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`);
  });
};

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void startServer();
}
