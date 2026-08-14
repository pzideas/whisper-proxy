export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("Whisper proxy (Cloudflare Worker) chal raha hai.");
    }

    // Main transcription endpoint
    if (request.method === "POST" && url.pathname === "/transcribe") {
      try {
        const incomingForm = await request.formData();
        const audioFile = incomingForm.get("audio");

        if (!audioFile) {
          return new Response(
            JSON.stringify({ error: "Koi audio file nahi mili." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const language = url.searchParams.get("language");

        const forwardForm = new FormData();
        forwardForm.append("file", audioFile, "audio.m4a");
        forwardForm.append("model", "whisper-1");
        if (language) {
          forwardForm.append("language", language);
        }

        const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: forwardForm,
        });

        const data = await openaiResponse.json();

        if (!openaiResponse.ok) {
          return new Response(
            JSON.stringify({ error: data.error?.message || "Whisper API error" }),
            { status: openaiResponse.status, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ text: data.text }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Server par masla aaya: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
