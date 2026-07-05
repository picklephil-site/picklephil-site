// Serves alternate "homepages" for special subdomains (win93 → PickleOS,
// testsite → the demo business site), while leaving every other host/path
// on this same Pages deployment untouched.
const HOST_HOMEPAGES: Record<string, string> = {
  "win93.philliphinshaw.com": "/pickleos.html",
  "testsite.philliphinshaw.com": "/testsite.html",
};

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const homepage = HOST_HOMEPAGES[url.hostname];
  if (homepage && (url.pathname === "/" || url.pathname === "/index.html")) {
    const rewritten = new URL(context.request.url);
    rewritten.pathname = homepage;
    return context.env.ASSETS.fetch(new Request(rewritten.toString(), context.request));
  }
  return context.next();
};
