import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

// --- 3D Tilt Wrapper ---
interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    glareColor?: string;
    style?: React.CSSProperties;
    isDarkMode?: boolean;
}

export const TiltCard = ({ children, className = "", glareColor = "#a855f7", style, isDarkMode = true }: TiltCardProps) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 30 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [7, -7]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-7, 7]);

    // Glare opacity based on distance from center
    const glareOpacity = useTransform(
        [mouseX, mouseY],
        ([latestX, latestY]: any[]) => {
            // simplified distance calculation
            const dist = Math.sqrt(latestX * latestX + latestY * latestY);
            return Math.min(dist * 1.5, 0.6); // slight glare
        }
    );
    const bgX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
    const bgY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const xPct = clickX / width - 0.5;
        const yPct = clickY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{
                ...style,
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative transition-transform duration-200 ease-out will-change-transform ${className}`}
        >
            <div style={{ transform: "translateZ(20px)" }} className="relative z-10 h-full">
                {children}
            </div>
            {/* Glare/Sheen */}
            <motion.div
                style={{
                    opacity: glareOpacity,
                    background: `linear-gradient(125deg, transparent 40%, ${glareColor}40 45%, ${glareColor}10 50%, transparent 55%)`,
                    backgroundPosition: useMotionTemplate`${bgX} ${bgY}`,  // moving sheen
                    backgroundSize: '200% 200%',
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
                    mixBlendMode: 'overlay'
                }}
            />
        </motion.div>
    );
};

// --- Spotlight Card Wrapper ---
export const SpotlightCard = ({ children, className = "", spotlightColor = "rgba(168,85,247,0.15)" }: { children: React.ReactNode, className?: string, spotlightColor?: string }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const div = divRef.current;
        const rect = div.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setOpacity(1);
    };

    const handleBlur = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleFocus}
            onMouseLeave={handleBlur}
            className={`relative overflow-hidden ${className}`}
        >
            {/* Spotlight Glow */}
            <div
                className="pointer-events-none absolute -inset-px transition duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />
            {/* Content */}
            <div className="relative z-10 h-full">{children}</div>
        </div>
    );
};
