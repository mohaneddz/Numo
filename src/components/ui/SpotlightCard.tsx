import React, { useRef, useState, useEffect } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface SpotlightCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    spotlightColor?: string;
    interactive?: boolean;
    overflowHidden?: boolean;
}

export function SpotlightCard({
    children,
    spotlightColor = 'rgba(139, 92, 246, 0.1)',
    interactive = false,
    overflowHidden = true,
    className = '',
    style,
    ...props
}: SpotlightCardProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    // Filter out layout container classes to move them from the container to the content wrapper.
    // We keep child-behavior classes like 'flex-1', 'flex-grow', 'col-span-*', etc. on the container.
    const containerClasses = className.split(' ').filter(c => 
        c !== 'flex' && 
        c !== 'grid' && 
        c !== 'inline-flex' && 
        c !== 'inline-grid' && 
        !c.startsWith('flex-row') && 
        !c.startsWith('flex-col') && 
        !c.startsWith('items-') && 
        !c.startsWith('justify-') && 
        !c.startsWith('gap-')
    ).join(' ');

    const contentClasses = className.split(' ').filter(c => 
        c === 'flex' || 
        c === 'grid' || 
        c === 'inline-flex' || 
        c === 'inline-grid' || 
        c.startsWith('flex-row') || 
        c.startsWith('flex-col') || 
        c.startsWith('items-') || 
        c.startsWith('justify-') || 
        c.startsWith('gap-')
    ).join(' ');

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!divRef.current) return;
            const rect = divRef.current.getBoundingClientRect();
            setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const hoverProps = interactive ? {
        whileHover: { scale: 1.01 },
        whileTap: { scale: 0.98 }
    } : {};

    return (
        <motion.div
            ref={divRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative bg-[#0F172A]/70 backdrop-blur-xl border border-white/5 rounded-[24px] shadow-[0_8px_32px_rgba(5,8,22,0.4)] transition-all duration-300 ${overflowHidden ? 'overflow-hidden' : ''} ${interactive ? 'cursor-pointer hover:shadow-2xl' : ''} ${containerClasses}`}
            style={style}
            {...hoverProps}
            {...props}
        >
            {/* Soft inner background glow when hovered */}
            <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] transition-opacity duration-500"
                style={{ opacity: isHovered ? 1 : 0 }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 50%)`
                    }}
                />
            </div>

            {/* Glowing active border that tracks the mouse even when outside */}
            <div
                className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] p-[1.5px] transition-opacity duration-300"
                style={{
                    opacity: 0.9,
                    background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(139, 92, 246, 0.6), rgba(34, 211, 238, 0.3), transparent 60%)`,
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'xor',
                }}
            />

            <div className={`relative z-10 h-full w-full ${contentClasses}`}>
                {children}
            </div>
        </motion.div>
    );
}
