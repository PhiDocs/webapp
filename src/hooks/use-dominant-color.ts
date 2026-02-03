import { useState, useEffect } from 'react';
import ColorThief from 'colorthief';

export function useDominantColor(imageUrl: string | undefined | null) {
    const [color, setColor] = useState<string | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setColor(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            try {
                const colorThief = new ColorThief();
                const result = colorThief.getColor(img);
                if (result) {
                    const hex = `#${result[0].toString(16).padStart(2, '0')}${result[1].toString(16).padStart(2, '0')}${result[2].toString(16).padStart(2, '0')}`;
                    setColor(hex);
                }
            } catch (e) {
                console.error('Failed to extract color from image', e);
                setColor(null);
            }
        };

        img.onerror = () => {
            console.warn('Failed to load image for color extraction');
            setColor(null);
        };

    }, [imageUrl]);

    return color;
}
