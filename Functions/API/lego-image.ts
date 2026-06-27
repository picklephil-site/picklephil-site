export interface Env {
  AI: Ai;
}

// Generates a LEGO-style image for a given build name + category.
// Usage: /api/lego-image?name=Puppy+Dog&cat=animals
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url  = new URL(request.url);
  const name = url.searchParams.get("name") || "LEGO sculpture";
  const cat  = url.searchParams.get("cat")  || "";

  const categoryHint: Record<string, string> = {
    animals:   "animal creature",
    vehicles:  "vehicle machine",
    buildings: "building structure",
    robots:    "robot machine",
    nature:    "nature scene",
    space:     "space spacecraft",
    food:      "food item",
    fantasy:   "fantasy creature",
    people:    "character figure",
    abstract:  "abstract art sculpture",
  };
  const hint = categoryHint[cat] || "object";

  const prompt =
    `LEGO brick model of a ${name}, ${hint}, assembled entirely from colorful ` +
    `plastic toy bricks, bright clean white background, product photography, ` +
    `studio lighting, sharp focus, vibrant LEGO primary colors, toy store display photo`;

  try {
    // @cf/bytedance/stable-diffusion-xl-lightning is fast (4 steps) and free on Workers AI
    const imageBytes = await (env.AI as any).run(
      "@cf/bytedance/stable-diffusion-xl-lightning",
      { prompt, num_steps: 4, guidance: 1 }
    );

    return new Response(imageBytes, {
      headers: {
        "Content-Type": "image/png",
        // Cache on CF edge for 24 h — same build name always gets same URL
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
