
interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    type?: 'website' | 'article' | 'video.movie' | 'video.tv_show';
    url?: string;
    robots?: string;
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
    jsonLd?: Record<string, unknown> | string;
}

export const SEO = (_props: SEOProps) => {
    return null;
};
