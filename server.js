const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let sensorData = {
    voltage: 230,
    current: 0,
    power: 0
};

app.post("/update", (req, res) => {
    sensorData = req.body;
    console.log("Data received:", sensorData);
    res.json({ message: "Data updated successfully" });
});

app.get("/data", (req, res) => {
    res.json(sensorData);
});

app.listen(PORT,"0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});