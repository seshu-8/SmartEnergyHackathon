let voltage = 230;

function updateSensorData() {

    let current = (Math.random() * 10).toFixed(2);
    let power = (voltage * current).toFixed(2);

    document.getElementById("voltage").innerText = voltage;
    document.getElementById("current").innerText = current;
    document.getElementById("power").innerText = power;

    calculateHealth(current);
    detectAnomaly(current);
    giveRecommendation(power);
}

function calculateHealth(current) {
    let health = 100 - (current * 3);
    if (health < 0) health = 0;
    document.getElementById("healthScore").innerText = health.toFixed(0) + "%";
}

function detectAnomaly(current) {
    if (current > 8) {
        document.getElementById("anomalyStatus").innerText = "⚠ High Current Detected!";
    } else {
        document.getElementById("anomalyStatus").innerText = "Normal";
    }
}

function giveRecommendation(power) {
    if (power > 1500) {
        document.getElementById("recommendation").innerText =
        "Reduce connected load. High power consumption detected.";
    } else {
        document.getElementById("recommendation").innerText =
        "Energy usage within optimal range.";
    }
}

function startVoice() {

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.start();

    recognition.onresult = function(event) {
        let command = event.results[0][0].transcript.toLowerCase();

        if (command.includes("status")) {
            updateSensorData();
        }
    };
}

setInterval(updateSensorData, 4000);