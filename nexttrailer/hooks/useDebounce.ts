import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook per debouncing di valori
 * Utile per ottimizzare ricerche e input frequenti
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Custom hook per creare funzioni debounced
 * Utile per ottimizzare chiamate API
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
) {
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const newTimeoutId = setTimeout(() => {
                callback(...args);
            }, delay);

            setTimeoutId(newTimeoutId);
        },
        [callback, delay, timeoutId]
    );

    return debouncedCallback;
}
