import { MetadataRoute } from 'next';

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nextrailer.it';

const fetchCollection = async (collection: string) => {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) return [];
  
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?key=${FIREBASE_API_KEY}&pageSize=50`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.documents) return [];

    return data.documents.map((doc: any) => {
      const docId = doc.name.split('/').pop();
      const publicId = doc.fields?.publicId?.stringValue;
      const id = publicId || docId;
      const publishedAt = doc.fields?.publishedAt?.stringValue || new Date().toISOString();
      return {
        url: `${SITE_URL}/news/${id}`,
        lastModified: new Date(publishedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });
  } catch (error) {
    console.error(`Error fetching ${collection} for sitemap:`, error);
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, comingsoon] = await Promise.all([
    fetchCollection('news_articles'),
    fetchCollection('news_comingsoon')
  ]);
  
  const newsRoutes = [...articles, ...comingsoon];

  const routes = [
    '',
    '/catalogo',
    '/search',
    '/genres',
    '/movies',
    '/tv',
    '/oscar',
    '/news',
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...routes, ...newsRoutes];
}
