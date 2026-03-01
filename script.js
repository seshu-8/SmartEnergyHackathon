console.log("✅ script.js loaded");

// ---------- UI Elements ----------
const voltageEl = document.getElementById("voltageVal");
const currentEl = document.getElementById("currentVal");
const powerEl   = document.getElementById("powerVal");
const statusEl  = document.getElementById("statusVal");

const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const anomalyEl = document.getElementById("anomalyVal");
const healthEl = document.getElementById("healthVal");
const recommendEl = document.getElementById("recommendVal");

// Optional typed fallback (only works if you added cmd + askBtn in HTML)
const cmdEl = document.getElementById("cmd");
const askBtn = document.getElementById("askBtn");

// ---------- Latest Data ----------
let latest = { voltage: 230, current: 0, power: 0 };

// ---------- Helpers ----------
function fmt(n, d) {
  const x = Number(n);
  if (Number.isNaN(x)) return "--";
  return x.toFixed(d);
}

function computeStatus(data) {
  const c = Number(data.current || 0);
  const p = Number(data.power || 0);
  if (c > 0.35 || p > 90) return "ALERT";
  return "NORMAL";
}
let healthScore = 100;
let anomalyHistory = []; // store last 30 classifications

function classifyAnomaly(data) {
  const c = Number(data.current || 0);
  const p = Number(data.power || 0);

  // Tune these for bulb demo
  if (c > 0.6 || p > 140) return "OVERLOAD";
  if (c > 0.35 || p > 90) return "POSSIBLE_FAULT";
  return "NORMAL";
}

function updateHealth(anomalyType) {
  // Penalize on anomalies, recover slowly when normal
  if (anomalyType === "OVERLOAD") healthScore = Math.max(0, healthScore - 15);
  else if (anomalyType === "POSSIBLE_FAULT") healthScore = Math.max(0, healthScore - 7);
  else healthScore = Math.min(100, healthScore + 2);

  return healthScore;
}

function getRecommendation(anomalyType, data) {
  const p = Number(data.power || 0);

  if (anomalyType === "OVERLOAD") {
    return "Reduce load immediately. Risk of overheating/fire. Check wiring and rating.";
  }
  if (anomalyType === "POSSIBLE_FAULT") {
    return "Unusual draw detected. Inspect appliance, loose connections, or aging components.";
  }

  // NORMAL recommendations
  if (p > 60) return "Moderate usage. Consider switching off when not needed to save energy.";
  return "All good. No action needed.";
}

// ---------- Fetch Data ----------
async function fetchData() {
  try {
    const res = await fetch("/data", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    latest = await res.json();

    if (voltageEl) voltageEl.textContent = fmt(latest.voltage, 0);
    if (currentEl) currentEl.textContent = fmt(latest.current, 3);
    if (powerEl) powerEl.textContent   = fmt(latest.power, 1);
    if (statusEl) statusEl.textContent  = computeStatus(latest);
    const anomalyType = classifyAnomaly(latest);
anomalyHistory.push(anomalyType);
if (anomalyHistory.length > 30) anomalyHistory.shift();

const hs = updateHealth(anomalyType);
const rec = getRecommendation(anomalyType, latest);

if (anomalyEl) anomalyEl.textContent = anomalyType;
if (healthEl) healthEl.textContent = hs;
if (recommendEl) recommendEl.textContent = rec;
  } catch (e) {
    console.log("❌ Fetch error:", e.message);
  }
}
setInterval(fetchData, 1500);
fetchData();

// ---------- Text-to-Speech ----------
function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("Speech Synthesis not supported in this browser.");
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// ---------- Assistant Reply Logic ----------
function answer(queryRaw) {
  const q = String(queryRaw || "").toLowerCase();
  const status = computeStatus(latest);

  if (q.includes("status") || q.includes("condition") || q.includes("how")) {
    if (status === "ALERT") {
      return `Alert. Current is ${fmt(latest.current, 3)} amps and power is ${fmt(latest.power, 1)} watts.`;
    }
    return `All good. Condition is normal. Current is ${fmt(latest.current, 3)} amps and power is ${fmt(latest.power, 1)} watts.`;
  }

  if (q.includes("current")) return `Current is ${fmt(latest.current, 3)} amps.`;
  if (q.includes("power") || q.includes("watt")) return `Power is ${fmt(latest.power, 1)} watts.`;
  if (q.includes("voltage")) return `Voltage reference is ${fmt(latest.voltage, 0)} volts.`;
  if (q.includes("health")) return `Health score is ${healthScore} out of 100.`;

if (q.includes("anomaly") || q.includes("fault") || q.includes("alert type")) {
  return `Anomaly type is ${classifyAnomaly(latest)}.`;
}

if (q.includes("recommend") || q.includes("suggestion")) {
  return getRecommendation(classifyAnomaly(latest), latest);
}

  return "Say status, current, power, health, anomaly, or recommendation.";
}

// ---------- Voice Recognition ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let listening = false;

function initRecognition() {
  if (!SpeechRecognition) {
    alert("Speech Recognition not supported. Use Chrome.");
    return null;
  }

  const r = new SpeechRecognition();
  r.lang = "en-US";              // most reliable
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 1;

  r.onresult = (event) => {
    // Take the most recent result
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript;

    // Show partial hearing
    voiceStatus.textContent = `Heard: "${text}"`;

    // Only speak when result is final (prevents repeated talking)
    if (last.isFinal) {
      const reply = answer(text);
      speak(reply);
    }
  };

  r.onerror = (event) => {
    voiceStatus.textContent = `Voice error: ${event.error}`;

    // Auto-retry for no-speech timeouts
    if (event.error === "no-speech" && listening) {
      setTimeout(() => {
        try { r.start(); } catch (e) {}
      }, 500);
      return;
    }

    listening = false;
    voiceBtn.textContent = "🎙 Enable Voice";
  };

  r.onend = () => {
    // Keep alive while listening
    if (listening) {
      setTimeout(() => {
        try { r.start(); } catch (e) {}
      }, 300);
    } else {
      voiceBtn.textContent = "🎙 Enable Voice";
      voiceStatus.textContent = "Voice: Off";
    }
  };

  return r;
}

function startListening() {
  if (!recog) recog = initRecognition();
  if (!recog) return;

  listening = true;
  voiceBtn.textContent = "🛑 Listening (click to stop)";
  voiceStatus.textContent = "Voice: Listening";

  try { recog.start(); } catch (e) {}
}

function stopListening() {
  listening = false;
  if (recog) {
    try { recog.stop(); } catch (e) {}
  }
  voiceBtn.textContent = "🎙 Enable Voice";
  voiceStatus.textContent = "Voice: Off";
}

if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    // Must be user click for mic permission
    if (!listening) startListening();
    else stopListening();
  });
}

// ---------- Typed fallback (optional) ----------
if (askBtn && cmdEl) {
  askBtn.addEventListener("click", () => {
    const q = cmdEl.value;
    const reply = answer(q);
    voiceStatus.textContent = `Typed: "${q}"`;
    speak(reply);
  });
}
