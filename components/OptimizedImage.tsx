import { useState, type ComponentProps } from 'react';
import Image from "next/image";

interface OptimizedImageProps extends Omit<ComponentProps<typeof Image>, "src" | "alt"> {
    src: string;
    alt: string;
}

/**
 * Componente immagine ottimizzato con lazy loading e placeholder
 */
export const OptimizedImage = ({
    src,
    alt,
    className = '',
    loading = 'lazy',
    sizes = '100vw',
    width,
    height,
    style,
    ...props
}: OptimizedImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const shouldFill = width == null && height == null;
    const siteHost = (() => {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
        try {
            return new URL(siteUrl).hostname;
        } catch {
            return "";
        }
    })();
    const isExternal = src.startsWith("http");
    const isAllowedExternal = (() => {
        if (!isExternal) return true;
        try {
            const hostname = new URL(src).hostname;
            if (hostname === "image.tmdb.org") return true;
            if (siteHost && hostname === siteHost) return true;
            return false;
        } catch {
            return false;
        }
    })();

    if (hasError) {
        return (
            <div
                className={`bg-secondary/20 flex items-center justify-center ${className}`}
            >
                <span className="text-muted-foreground text-sm">Immagine non disponibile</span>
            </div>
        );
    }

    if (isExternal && !isAllowedExternal) {
        const fallbackStyle = shouldFill ? { width: "100%", height: "100%", ...style } : { ...style };
        return (
            <div className={`relative${shouldFill ? " w-full h-full" : ""}`}>
                {!isLoaded && (
                    <div
                        className={`absolute inset-0 bg-secondary/20 animate-pulse ${className}`}
                    />
                )}
                <img
                    src={src}
                    alt={alt}
                    loading={loading}
                    style={fallbackStyle}
                    width={shouldFill ? undefined : width}
                    height={shouldFill ? undefined : height}
                    className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                />
            </div>
        );
    }

    return (
        <div className={`relative${shouldFill ? " w-full h-full" : ""}`}>
            {!isLoaded && (
                <div
                    className={`absolute inset-0 bg-secondary/20 animate-pulse ${className}`}
                />
            )}
            <Image
                src={src}
                alt={alt}
                loading={loading}
                sizes={sizes}
                fill={shouldFill}
                width={shouldFill ? undefined : width}
                height={shouldFill ? undefined : height}
                style={{ ...style }}
                className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
                onLoadingComplete={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                {...props}
            />
        </div>
    );
};
