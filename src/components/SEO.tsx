
import React from 'react';
import { Helmet } from 'react-helmet-async';

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

export const SEO = ({
    title = "NextTrailer - Scopri Film e Serie TV",
    description = "Esplora i film e le serie TV di tendenza, guarda i trailer e crea la tua watchlist personalizzata.",
    image = "/og-image.png",
    type = "website",
    url,
    robots = "index, follow",
    publishedTime,
    modifiedTime,
    author,
    section,
    tags,
    jsonLd
}: SEOProps) => {
    const siteTitle = "NextTrailer";
    const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;
    const baseUrl = (import.meta?.env?.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const resolvedUrl = url || (typeof window !== "undefined" ? window.location.href : baseUrl || "");
    const origin = typeof window !== "undefined" ? window.location.origin : baseUrl;

    const fullImage = image.startsWith('http') ? image : origin ? `${origin}${image}` : image;
    const jsonLdString = typeof jsonLd === "string" ? jsonLd : jsonLd ? JSON.stringify(jsonLd) : "";

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robots} />
            <link rel="canonical" href={resolvedUrl} />

            <meta property="og:type" content={type} />
            <meta property="og:url" content={resolvedUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImage} />
            <meta property="og:image:alt" content={fullTitle} />
            <meta property="og:site_name" content={siteTitle} />
            <meta property="og:locale" content="it_IT" />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={resolvedUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={fullImage} />
            {type === "article" && publishedTime && (
                <meta property="article:published_time" content={publishedTime} />
            )}
            {type === "article" && modifiedTime && (
                <meta property="article:modified_time" content={modifiedTime} />
            )}
            {type === "article" && author && (
                <meta property="article:author" content={author} />
            )}
            {type === "article" && section && (
                <meta property="article:section" content={section} />
            )}
            {type === "article" && tags?.map((tag) => (
                <meta key={`article-tag-${tag}`} property="article:tag" content={tag} />
            ))}
            {jsonLdString && (
                <script type="application/ld+json">{jsonLdString}</script>
            )}
        </Helmet>
    );
};
