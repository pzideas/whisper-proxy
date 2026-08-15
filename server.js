const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const HF_TOKEN = process.env.HF_API_TOKEN;

const HF_MODEL_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3";

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Koi audio file nahi mili" });
    }

    if (!HF_TOKEN) {
      return res.status(500).json({ error: "Server par HF_API_TOKEN set nahi hai" });
    }

    console.log(`Audio mila, size: ${req.file.size} bytes`);

    const hfResponse = await fetch(HF_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": req.file.mimetype || "audio/m4a"
      },
      body: req.file.buffer
    });

    const hfText = await hfResponse.text();
    console.log(`Hugging Face response code: ${hfResponse.status}`);

    if (!hfResponse.ok) {
      return res.status(502).json({ error: `Hugging Face error (${hfResponse.status}): ${hfText.slice(0, 300)}` });
    }

    const hfJson = JSON.parse(hfText);

    if (hfJson.error) {
      return res.status(503).json({ error: hfJson.error });
    }

    return res.json({ text: hfJson.text || "" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: `Server exception: ${err.message}` });
  }
});

app.get("/", (req, res) => {
  res.send("Whisper proxy server chal raha hai ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} par`));
