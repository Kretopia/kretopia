// Temporary TTS function for product video voiceover generation.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const { text, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = await req.json();
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return new Response("missing key", { status: 500, headers: corsHeaders });
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 },
      }),
    },
  );
  if (!r.ok) return new Response(await r.text(), { status: r.status, headers: corsHeaders });
  const buf = await r.arrayBuffer();
  return new Response(buf, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
});
