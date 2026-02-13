const toFirst = (value) => (Array.isArray(value) ? value[0] : value);
const safeString = (value) => {
  const raw = toFirst(value);
  if (raw === undefined || raw === null) return "";
  return String(raw);
};
const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const clamp = (value, max) => (value.length > max ? value.slice(0, max) : value);

export default function handler(req, res) {
  const title = clamp(safeString(req.query?.title), 200);
  const description = clamp(safeString(req.query?.description), 400);
  const image = safeString(req.query?.image);
  const url = safeString(req.query?.url);
  const host = req.headers?.host || "nextrailer.vercel.app";
  const origin = `https://${host}`;
  const resolvedUrl = url || `${origin}/news`;
  const resolvedImage = image || `${origin}/og-image.png`;
  const html = `<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title || "NextTrailer")}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(resolvedUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(resolvedUrl)}" />
    <meta property="og:title" content="${escapeHtml(title || "NextTrailer")}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(resolvedImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title || "NextTrailer")}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(resolvedImage)}" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(resolvedUrl)}" />
  </head>
  <body>
    <a href="${escapeHtml(resolvedUrl)}">${escapeHtml(resolvedUrl)}</a>
    <script>
      window.location.replace(${JSON.stringify(resolvedUrl)});
    </script>
  </body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(html);
}
