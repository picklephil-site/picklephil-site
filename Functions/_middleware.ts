// Serves PickleOS 93 as the "homepage" when visited via win93.philliphinshaw.com,
// while leaving every other host/path on this same Pages deployment untouched.
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname === "win93.philliphinshaw.com" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const rewritten = new URL(context.request.url);
    rewritten.pathname = "/pickleos.html";
    return context.env.ASSETS.fetch(new Request(rewritten.toString(), context.request));
  }
  return context.next();
};
