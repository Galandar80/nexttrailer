import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const readEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .reduce((acc, line) => {
      const index = line.indexOf("=");
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      acc[key] = value;
      return acc;
    }, {});
};

const env = {
  ...readEnvFile(path.join(rootDir, ".env")),
  ...readEnvFile(path.join(rootDir, ".env.local")),
  ...readEnvFile(path.join(rootDir, ".env.production")),
  ...readEnvFile(path.join(rootDir, ".env.production.local"))
};

const baseUrl = (env.VITE_PUBLIC_SITE_URL || "https://nextrailer.vercel.app").replace(/\/$/, "");
const projectId = env.VITE_FIREBASE_PROJECT_ID || "";
const apiKey = env.VITE_FIREBASE_API_KEY || "";
const today = new Date().toISOString().split("T")[0];

const staticRoutes = [
  "/",
  "/catalogo",
  "/search",
  "/genres",
  "/movies",
  "/tv",
  "/oscar",
  "/news",
  "/news/archivio"
];

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatLastmod = (value) => {
  if (!value) return today;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;
  return date.toISOString().split("T")[0];
};

const getFieldValue = (fields, key) => {
  const field = fields?.[key];
  if (!field) return null;
  if (field.integerValue) return Number(field.integerValue);
  if (field.doubleValue) return Number(field.doubleValue);
  if (field.stringValue) return field.stringValue;
  if (field.timestampValue) return field.timestampValue;
  return null;
};

const fetchCollection = async (collection) => {
  if (!projectId || !apiKey) return [];
  const entries = [];
  let pageToken = "";
  do {
    const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=1000&key=${apiKey}${tokenQuery}`;
    const response = await fetch(url);
    if (!response.ok) {
      break;
    }
    const data = await response.json();
    const docs = data.documents || [];
    for (const doc of docs) {
      const id = doc.name.split("/").pop();
      const fields = doc.fields || {};
      const publishedAt = getFieldValue(fields, "publishedAt");
      const publishedAtTs = getFieldValue(fields, "publishedAtTs");
      const publicId = getFieldValue(fields, "publicId");
      entries.push({
        id,
        publicId,
        lastmod: publishedAtTs ? formatLastmod(publishedAtTs) : formatLastmod(publishedAt)
      });
    }
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return entries;
};

const build = async () => {
  const urls = staticRoutes.map((route) => ({
    loc: `${baseUrl}${route}`,
    lastmod: today
  }));

  const [newsArticles, comingsoonArticles] = await Promise.all([
    fetchCollection("news_articles"),
    fetchCollection("news_comingsoon")
  ]);

  const articleUrls = [...newsArticles, ...comingsoonArticles]
    .filter((entry) => entry.id || entry.publicId)
    .map((entry) => {
      const slug = entry.publicId || entry.id;
      return {
        loc: `${baseUrl}/news/${slug}`,
        lastmod: entry.lastmod || today
      };
    });

  const allUrls = [...urls, ...articleUrls];
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...allUrls.map((entry) => {
      return [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        "  </url>"
      ].join("\n");
    }),
    `</urlset>`
  ].join("\n");

  const outputPath = path.join(rootDir, "public", "sitemap.xml");
  writeFileSync(outputPath, xml);
};

build();
