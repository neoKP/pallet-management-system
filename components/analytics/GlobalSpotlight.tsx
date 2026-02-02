import React, { useEffect, useState } from 'react';

export const GlobalSpotlight = () => {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setPos({ x: e.clientX, y: e.clientY });
            setOpacity(1);
        };

        const handleMouseLeave = () => {
            setOpacity(0);
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div
            className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 bg-[radial-gradient(600px_circle_at_var(--pos-x)_var(--pos-y),rgba(139,92,246,0.08),transparent_40%)] js-dynamic-opacity"
            style={{
                '--dynamic-opacity': opacity,
                '--pos-x': `${pos.x}px`,
                '--pos-y': `${pos.y}px`
            } as React.CSSProperties}
        />
    );
};
