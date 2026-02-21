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

    if (hasError) {
        return (
            <div
                className={`bg-secondary/20 flex items-center justify-center ${className}`}
            >
                <span className="text-muted-foreground text-sm">Immagine non disponibile</span>
            </div>
        );
    }

    return (
        <div className="relative">
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
                width={width ?? 1}
                height={height ?? 1}
                style={{ width: "100%", height: "100%", ...style }}
                className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
                onLoadingComplete={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                {...props}
            />
        </div>
    );
};
