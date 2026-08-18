// v3
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sirf POST allowed hai" });
  }

  const HF_TOKEN = process.env.HF_API_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ error: "Server par HF_API_TOKEN set nahi hai" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: "Koi audio data nahi mila" });
    }

    const contentType = req.headers["content-type"] || "audio/m4a";

    // Naya Hugging Face "Inference Providers" URL format + chhota/tez model
    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/openai/whisper-small",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    const hfText = await hfResponse.text();

    if (!hfResponse.ok) {
      return res.status(502).json({ error: `HF error (${hfResponse.status}): ${hfText.slice(0, 300)}` });
    }

    const hfJson = JSON.parse(hfText);
    if (hfJson.error) {
      return res.status(503).json({ error: hfJson.error });
    }

    return res.status(200).json({ text: hfJson.text || "" });
  } catch (err) {
    return res.status(500).json({ error: `Server exception: ${err.message}` });
  }
}
