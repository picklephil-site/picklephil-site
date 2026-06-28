export interface Env {
  AI: Ai;
}

// Generates an image from a free-form prompt.
// Usage: GET /api/imagine?prompt=a+sunset+over+mountains
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url    = new URL(request.url);
  const prompt = (url.searchParams.get("prompt") || "").trim() || "a beautiful landscape";

  if (!env.AI) {
    return new Response(
      JSON.stringify({ error: "AI binding not found" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const imageBytes = await (env.AI as any).run(
      "@cf/bytedance/stable-diffusion-xl-lightning",
      { prompt, num_steps: 4 }
    );
    return new Response(imageBytes, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Image generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
