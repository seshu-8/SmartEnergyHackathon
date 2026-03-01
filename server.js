const express = require("express");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Latest data (starts with demo values so UI is never blank)
let sensorData = {
  voltage: 230,
  current: 0.0,
  power: 0.0
};

// ESP32 posts here
app.post("/update", (req, res) => {
  const { voltage, current, power } = req.body;

  if (
    typeof voltage === "number" &&
    typeof current === "number" &&
    typeof power === "number"
  ) {
    sensorData = { voltage, current, power };
    console.log("✅ Updated from ESP32:", sensorData);
  } else {
    console.log("⚠ Invalid payload:", req.body);
  }

  res.json({ ok: true });
});

// Frontend reads here
app.get("/data", (req, res) => {
  res.json(sensorData);
});

// Root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
