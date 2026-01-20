import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BranchId } from '../../types';
import { BRANCHES } from '../../constants';
import { ArrowRightLeft, Zap } from 'lucide-react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { THEMES } from './ThemeEngine';

interface SankeyNode {
    id: string;
    name: string;
    x: number;
    y: number;
    height: number;
    color: string;
    totalValue: number;
}

interface SankeyLink {
    source: string;
    sourceName: string;
    target: string;
    targetName: string;
    value: number;
    path: string;
    width: number;
    color: string;
    sourceY: number;
    targetY: number;
}

interface SankeyDiagramProps {
    data: {
        source: string;
        dest: string;
        qty: number;
    }[];
    title?: string;
    isDarkMode: boolean;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
    data,
    title = "Pallet Transfer Flow",
    isDarkMode
}) => {
    const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const { themeColor } = useAnalyticsStore();
    const currentTheme = THEMES.find(t => t.id === themeColor) || THEMES[0];

    // Base constants
    const width = 800;
    const nodeWidth = 24;
    const padding = 60;
    const minNodeHeight = 32;
    const nodeGap = 16;
    const topMargin = 20;

    // Filter and prepare data
    const filteredData = useMemo(() => data.filter(d => d.source !== d.dest && d.qty > 0), [data]);

    const { nodes, links, totalFlow, svgHeight } = useMemo(() => {
        // Calculate totals
        const sourceTotals: Record<string, number> = {};
        const targetTotals: Record<string, number> = {};
        filteredData.forEach(d => {
            sourceTotals[d.source] = (sourceTotals[d.source] || 0) + d.qty;
            targetTotals[d.dest] = (targetTotals[d.dest] || 0) + d.qty;
        });

        const totalValue = Object.values(sourceTotals).reduce((a, b) => a + b, 0) || 1;
        const sourceEntries = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1]);
        const targetEntries = Object.entries(targetTotals).sort((a, b) => b[1] - a[1]);

        // CALCULATE ACTUAL HEIGHT NEEDED
        // We use a fixed "flexible space" of 400px plus the sum of all mandatory minimums and gaps
        const flexSpace = 300;
        const sourceReq = sourceEntries.length * (minNodeHeight + nodeGap) + flexSpace;
        const targetReq = targetEntries.length * (minNodeHeight + nodeGap) + flexSpace;
        const internalHeight = Math.max(sourceReq, targetReq, 500);
        const totalSvgHeight = internalHeight + (padding * 2) + topMargin;

        const nodes: SankeyNode[] = [];
        const links: SankeyLink[] = [];

        // Position Source Nodes
        let currentY = padding + topMargin;
        const usableHeightS = internalHeight - (sourceEntries.length * nodeGap);
        sourceEntries.forEach(([id, val]) => {
            const h = Math.max((val / totalValue) * (usableHeightS * 0.8), minNodeHeight);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id,
                name: branch?.name || id,
                x: padding,
                y: currentY,
                height: h,
                color: currentTheme.primary,
                totalValue: val
            });
            currentY += h + nodeGap;
        });

        // Position Target Nodes (Right)
        currentY = padding + topMargin;
        const usableHeightT = internalHeight - (targetEntries.length * nodeGap);
        targetEntries.forEach(([id, val]) => {
            const h = Math.max((val / totalValue) * (usableHeightT * 0.8), minNodeHeight);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id: id + '_target',
                name: branch?.name || id,
                x: width - padding - nodeWidth,
                y: currentY,
                height: h,
                color: currentTheme.secondary,
                totalValue: val
            });
            currentY += h + nodeGap;
        });

        // Track target offsets for proper stacking
        const targetOffsets: Record<string, number> = {};

        // Create Links
        nodes.filter(n => !n.id.endsWith('_target')).forEach(sourceNode => {
            let sOffset = 0;
            filteredData.filter(d => d.source === sourceNode.id).forEach(d => {
                const targetNode = nodes.find(n => n.id === d.dest + '_target');
                if (targetNode) {
                    const linkWidth = Math.max((d.qty / (sourceTotals[sourceNode.id] || 1)) * sourceNode.height, 3);

                    if (targetOffsets[d.dest] === undefined) targetOffsets[d.dest] = 0;
                    const tOffset = targetOffsets[d.dest];

                    const x0 = sourceNode.x + nodeWidth;
                    const y0 = sourceNode.y + sOffset + linkWidth / 2;
                    const x1 = targetNode.x;
                    const y1 = targetNode.y + tOffset + linkWidth / 2;

                    const curvature = 0.5;
                    const xi = (x0 + x1) * curvature;
                    const path = `M${x0},${y0} C${xi},${y0} ${x1 - (x1 - x0) * curvature},${y1} ${x1},${y1}`;

                    const sourceBranch = BRANCHES.find(b => b.id === sourceNode.id);
                    const targetBranch = BRANCHES.find(b => b.id === d.dest);

                    links.push({
                        source: sourceNode.id,
                        sourceName: sourceBranch?.name || sourceNode.id,
                        target: d.dest,
                        targetName: targetBranch?.name || d.dest,
                        value: d.qty,
                        path,
                        width: linkWidth,
                        color: sourceNode.color,
                        sourceY: y0,
                        targetY: y1
                    });

                    sOffset += linkWidth;
                    targetOffsets[d.dest] += linkWidth;
                }
            });
        });

        return { nodes, links, totalFlow: totalValue === 1 && filteredData.length === 0 ? 0 : totalValue, svgHeight: totalSvgHeight };
    }, [filteredData, currentTheme, width]);

    const handleLinkHover = (link: SankeyLink | null, event?: React.MouseEvent) => {
        setHoveredLink(link);
        if (event) {
            const rect = event.currentTarget.getBoundingClientRect();
            setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });
        }
    };

    const isLinkHighlighted = (link: SankeyLink) => {
        if (!hoveredLink && !hoveredNode) return true;
        if (hoveredLink === link) return true;
        if (hoveredNode === link.source || hoveredNode === link.target) return true;
        return false;
    };

    const isNodeHighlighted = (node: SankeyNode) => {
        if (!hoveredLink && !hoveredNode) return true;
        if (hoveredNode === node.id || hoveredNode === node.id.replace('_target', '')) return true;
        if (hoveredLink && (hoveredLink.source === node.id || hoveredLink.target + '_target' === node.id ||
            hoveredLink.source === node.id.replace('_target', '') || hoveredLink.target === node.id.replace('_target', ''))) {
            return true;
        }
        return false;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-3xl shadow-xl transition-all duration-500 overflow-hidden ${isDarkMode
                ? 'bg-slate-900/50 border border-slate-800 backdrop-blur-md'
                : 'bg-white border border-slate-200 shadow-slate-200/50'
                }`}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-black flex items-center gap-2 transition-colors duration-500`}>
                    <div
                        className="w-2 h-8 rounded-full shadow-lg theme-bg-primary theme-shadow-primary"
                    />
                    <span className={isDarkMode ? 'text-white' : 'text-black'}>{title}</span>
                    {totalFlow > 0 && (
                        <span
                            className="ml-2 text-xs font-bold px-3 py-1 rounded-full shadow-inner theme-bg-soft theme-text-primary"
                        >
                            {totalFlow.toLocaleString()} total
                        </span>
                    )}
                </h3>
                <span className="text-xs font-medium opacity-50 uppercase tracking-widest">Source ➜ Destination</span>
            </div>

            <div
                className="relative w-full overflow-x-auto"
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
            >
                <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} className="mx-auto">
                    <defs>
                        {/* Gradient definitions for normal state */}
                        {links.map((link, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={currentTheme.primary} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={currentTheme.secondary} stopOpacity="0.4" />
                            </linearGradient>
                        ))}
                        {/* Highlighted gradient */}
                        <linearGradient id="grad-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={currentTheme.primary} stopOpacity={1} />
                            <stop offset="50%" stopColor={currentTheme.accent || '#ec4899'} stopOpacity={1} />
                            <stop offset="100%" stopColor={currentTheme.secondary} stopOpacity={1} />
                        </linearGradient>
                        {/* Glow filter */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Pulse animation */}
                        <filter id="pulse-glow" x="-100%" y="-100%" width="300%" height="300%">
                            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Node glow */}
                        <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Rainbow Ribbon Gradient */}
                        <linearGradient id="grad-rainbow-ribbon" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#ff0000" />
                            <stop offset="14%" stopColor="#ff7f00" />
                            <stop offset="28%" stopColor="#ffff00" />
                            <stop offset="42%" stopColor="#00ff00" />
                            <stop offset="56%" stopColor="#0000ff" />
                            <stop offset="70%" stopColor="#4b0082" />
                            <stop offset="84%" stopColor="#9400d3" />
                            <stop offset="100%" stopColor="#ff0000" />
                        </linearGradient>
                    </defs>

                    {/* Links - Background layer (all dimmed when something is hovered) */}
                    {links.map((link, i) => (
                        <motion.path
                            key={`link-bg-${i}`}
                            d={link.path}
                            stroke={`url(#grad-${i})`}
                            strokeWidth={link.width}
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: isLinkHighlighted(link) ? 0.4 : 0.08,
                            }}
                            transition={{ duration: 1.5, delay: i * 0.05 }}
                            className="pointer-events-none"
                        />
                    ))}

                    {/* Rainbow Ribbon - "Lively Flow" layer */}
                    {links.map((link, i) => (
                        <motion.path
                            key={`link-rainbow-${i}`}
                            d={link.path}
                            stroke="url(#grad-rainbow-ribbon)"
                            strokeWidth={link.width * 0.8}
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: isLinkHighlighted(link) ? 0.6 : 0,
                                strokeDashoffset: [0, -40],
                            }}
                            transition={{
                                pathLength: { duration: 1.5, delay: i * 0.05 },
                                opacity: { duration: 0.5 },
                                strokeDashoffset: { duration: 3, repeat: Infinity, ease: "linear" }
                            }}
                            strokeDasharray="20, 20"
                            className="pointer-events-none"
                            style={{
                                mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                                filter: 'blur(1px)'
                            }}
                        />
                    ))}

                    {/* Global Moving Particles - "The Running Effect" */}
                    {links.map((link, i) => (
                        <circle
                            key={`running-particle-${i}`}
                            r={2.5}
                            fill={isDarkMode ? '#ffffff' : '#3b82f6'}
                            style={{
                                filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))',
                                opacity: isLinkHighlighted(link) ? 0.9 : 0,
                                transition: 'opacity 0.3s ease-in-out'
                            }}
                        >
                            <animateMotion
                                dur={`${2.5 + (i % 3)}s`}
                                repeatCount="indefinite"
                                path={link.path}
                                rotate="auto"
                                begin={`${i * 0.2}s`}
                            />
                        </circle>
                    ))}

                    {/* Links - Interactive layer with hover effects */}
                    {links.map((link, i) => (
                        <motion.path
                            key={`link-${i}`}
                            d={link.path}
                            stroke={hoveredLink === link ? 'url(#grad-highlight)' : `url(#grad-${i})`}
                            strokeWidth={link.width + (hoveredLink === link ? 4 : 0)}
                            fill="none"
                            filter={hoveredLink === link ? 'url(#pulse-glow)' : undefined}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: hoveredLink === link ? 1 : (isLinkHighlighted(link) ? 0.7 : 0.1),
                                strokeWidth: hoveredLink === link ? link.width + 6 : link.width,
                            }}
                            transition={{
                                pathLength: { duration: 1.5, delay: i * 0.05 },
                                opacity: { duration: 0.3 },
                                strokeWidth: { duration: 0.2 }
                            }}
                            onMouseEnter={(e) => handleLinkHover(link, e)}
                            onMouseLeave={() => handleLinkHover(null)}
                            className="cursor-pointer"
                            style={{
                                transition: 'filter 0.3s ease'
                            }}
                        />
                    ))}

                    {/* Animated particles on hovered link */}
                    {hoveredLink && (
                        <>
                            {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => (
                                <motion.circle
                                    key={`particle-${i}`}
                                    r={4}
                                    fill="#22d3ee"
                                    filter="url(#glow)"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{
                                        duration: 1.5,
                                        delay: offset,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                >
                                    <animateMotion
                                        dur="1.5s"
                                        repeatCount="indefinite"
                                        begin={`${offset}s`}
                                        path={hoveredLink.path}
                                    />
                                </motion.circle>
                            ))}
                        </>
                    )}

                    {/* Nodes */}
                    {nodes.map((node, i) => {
                        const highlighted = isNodeHighlighted(node);
                        const isHovered = hoveredNode === node.id || hoveredNode === node.id.replace('_target', '');

                        return (
                            <g
                                key={`node-${i}`}
                                onMouseEnter={() => setHoveredNode(node.id.replace('_target', ''))}
                                onMouseLeave={() => setHoveredNode(null)}
                                className="cursor-pointer"
                            >
                                {/* Node glow effect */}
                                {isHovered && (
                                    <motion.rect
                                        x={node.x - 4}
                                        y={node.y - 4}
                                        width={nodeWidth + 8}
                                        height={node.height + 8}
                                        fill={node.id.endsWith('_target') ? '#8b5cf6' : '#6366f1'}
                                        rx={8}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 0.3 }}
                                        filter="url(#node-glow)"
                                    />
                                )}

                                {/* Main node */}
                                <motion.rect
                                    x={node.x}
                                    y={node.y}
                                    width={nodeWidth}
                                    height={node.height}
                                    fill={isHovered
                                        ? (node.id.endsWith('_target') ? '#a855f7' : '#818cf8')
                                        : (highlighted ? node.color : 'rgba(100,100,100,0.3)')
                                    }
                                    rx={4}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{
                                        height: node.height,
                                        opacity: 1,
                                        scale: isHovered ? 1.1 : 1,
                                    }}
                                    transition={{
                                        height: { duration: 0.8, delay: 0.3 },
                                        scale: { duration: 0.2 }
                                    }}
                                    filter={isHovered ? 'url(#node-glow)' : undefined}
                                    style={{
                                        transformOrigin: `${node.x + nodeWidth / 2}px ${node.y + node.height / 2}px`
                                    }}
                                />

                                {/* Node label */}
                                <motion.text
                                    x={node.x + (node.id.endsWith('_target') ? -8 : nodeWidth + 8)}
                                    y={node.y + node.height / 2}
                                    dy=".35em"
                                    textAnchor={node.id.endsWith('_target') ? 'end' : 'start'}
                                    className={`text-[10px] font-bold transition-all duration-300 ${isHovered
                                        ? 'fill-cyan-400'
                                        : highlighted
                                            ? (isDarkMode ? 'fill-slate-300' : 'fill-slate-700')
                                            : (isDarkMode ? 'fill-slate-600' : 'fill-slate-400')
                                        }`}
                                    animate={{
                                        fontSize: isHovered ? '12px' : '10px',
                                        fontWeight: isHovered ? 800 : 600
                                    }}
                                >
                                    {node.name}
                                </motion.text>

                                {/* Value label on hover */}
                                <AnimatePresence>
                                    {isHovered && (
                                        <motion.text
                                            x={node.x + (node.id.endsWith('_target') ? -8 : nodeWidth + 8)}
                                            y={node.y + node.height / 2 + 14}
                                            dy=".35em"
                                            textAnchor={node.id.endsWith('_target') ? 'end' : 'start'}
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="text-[9px] fill-indigo-400 font-bold"
                                        >
                                            {node.totalValue.toLocaleString()} พาเลท
                                        </motion.text>
                                    )}
                                </AnimatePresence>
                            </g>
                        );
                    })}
                </svg>

                {/* Floating Tooltip */}
                <AnimatePresence>
                    {hoveredLink && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className={`
                                absolute pointer-events-none z-50
                                px-4 py-3 rounded-xl shadow-2xl border
                                ${isDarkMode
                                    ? 'bg-slate-800/95 border-cyan-500/30 backdrop-blur-md'
                                    : 'bg-white/95 border-indigo-200 backdrop-blur-md'
                                }
                            `}
                            style={{
                                left: Math.min(mousePos.x + 20, width - 200),
                                top: Math.max(mousePos.y - 60, 10),
                            }}
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-xl -z-10" />

                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500">
                                    <ArrowRightLeft className="w-4 h-4 text-white" />
                                </div>
                                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                    Transfer Flow
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 uppercase">From:</span>
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-cyan-400' : 'text-indigo-600'}`}>
                                        {hoveredLink.sourceName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 uppercase">To:</span>
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                        {hoveredLink.targetName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {hoveredLink.value.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-slate-400">พาเลท</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 flex justify-between text-[10px] font-bold opacity-30 uppercase tracking-widest px-4">
                <span>Shipping Point</span>
                <span>Receiving Point</span>
            </div>
        </motion.div>
    );
};
