const CACHE_TTL_MS = 1000 * 60 * 10;
const cache = new Map();

const getCached = (url) => {
  const cached = cache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return cached.data;
};

const setCached = (url, data) => {
  cache.set(url, { data, timestamp: Date.now() });
};

const toSafeUrl = (value) => {
  if (!value) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw);
};

export default async function handler(req, res) {
  const url = toSafeUrl(req.query?.url);
  if (!url) {
    res.status(400).json({ error: "Parametro url mancante" });
    return;
  }

  const cached = getCached(url);
  if (cached) {
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=900");
    res.status(200).send(cached);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ error: response.statusText || "Errore RSS" });
      return;
    }
    const data = await response.text();
    setCached(url, data);
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=900");
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: "Errore lettura RSS" });
  }
}
