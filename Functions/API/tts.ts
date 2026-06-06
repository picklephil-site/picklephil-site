export interface Env {
  EL_KEY: string; // ElevenLabs API key as a Secret
}

function cors(h = new Headers()) {
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  return h;
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: cors() });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const voice = url.searchParams.get("voice") || "JBFqnCBsd6RMkjVDRZzb";
  const text = (url.searchParams.get("text") || "").trim();

  if (!text) {
    return new Response("Missing text", { status: 400, headers: cors() });
  }

  const key = env.EL_KEY || "sk_b691a044ad0303e329924dd26f843ce6dde1340ea90b2c95";

  const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!elRes.ok) {
    const err = await elRes.text();
    return new Response(err, { status: elRes.status, headers: cors() });
  }

  const audio = await elRes.arrayBuffer();
  return new Response(audio, {
    headers: cors(new Headers({ "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" })),
  });
};
