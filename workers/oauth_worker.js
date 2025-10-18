// Minimal GitHub OAuth proxy for Decap CMS on Cloudflare Workers
// 1) Set secrets: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REPO
// 2) Optional: set REDIRECT_URI to your worker URL + '/callback'
// 3) In admin/config.yml set base_url to your worker URL and auth_endpoint to '/auth'
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const redirect_uri = env.REDIRECT_URI || (url.origin + "/callback");
      const auth = new URL("https://github.com/login/oauth/authorize");
      auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      auth.searchParams.set("redirect_uri", redirect_uri);
      auth.searchParams.set("scope", "repo");
      auth.searchParams.set("state", state);
      return Response.redirect(auth.toString(), 302);
    }
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const redirect_uri = env.REDIRECT_URI || (url.origin + "/callback");
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code, redirect_uri
        })
      });
      const tokenJson = await tokenRes.json();
      // Return token in Decap-compatible format
      return new Response(JSON.stringify({ token: tokenJson.access_token }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    return new Response("OK", {status: 200});
  }
}
