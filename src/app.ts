import "dotenv/config";
import express from "express";
import { mqttIngestionService, startMqttIngestion } from "./services/mqttIngestion.service.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/latest-readings", (_req, res) => {
  res.json(mqttIngestionService.getLatestSensorReadings());
});

app.get("/api/status", (_req, res) => {
  res.json(mqttIngestionService.getLatestChipStatuses());
});

void startMqttIngestion();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});
