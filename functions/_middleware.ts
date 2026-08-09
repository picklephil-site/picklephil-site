// Serves alternate "homepages" for special subdomains (win93 → PickleOS,
// testsite → the demo business site, marvel → the MCU/comics page), while
// leaving every other host/path on this same Pages deployment untouched.
// Extensionless paths: Pages 308-redirects "*.html" to the clean URL,
// which would leak the path into the visitor's address bar.
const HOST_HOMEPAGES: Record<string, string> = {
  "win93.philliphinshaw.com": "/pickleos",
  "testsite.philliphinshaw.com": "/testsite",
  "marvel.philliphinshaw.com": "/marvel",
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
