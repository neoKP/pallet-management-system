import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRANCHES } from '../../constants';
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

    const width = 800;
    const nodeWidth = 24;
    const padding = 60;
    const minNodeHeight = 32;
    const nodeGap = 16;
    const topMargin = 20;

    const filteredData = useMemo(() => data.filter(d => d.source !== d.dest && d.qty > 0), [data]);

    const { nodes, links, totalFlow, svgHeight } = useMemo(() => {
        const sourceTotals: Record<string, number> = {};
        const targetTotals: Record<string, number> = {};
        filteredData.forEach(d => {
            sourceTotals[d.source] = (sourceTotals[d.source] || 0) + d.qty;
            targetTotals[d.dest] = (targetTotals[d.dest] || 0) + d.qty;
        });

        const totalValue = Object.values(sourceTotals).reduce((a, b) => a + b, 0) || 1;
        const sourceEntries = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1]);
        const targetEntries = Object.entries(targetTotals).sort((a, b) => b[1] - a[1]);

        const flexSpace = 300;
        const sourceReq = sourceEntries.length * (minNodeHeight + nodeGap) + flexSpace;
        const targetReq = targetEntries.length * (minNodeHeight + nodeGap) + flexSpace;
        const internalHeight = Math.max(sourceReq, targetReq, 500);
        const totalSvgHeight = internalHeight + (padding * 2) + topMargin;

        const nodes: SankeyNode[] = [];
        const links: SankeyLink[] = [];

        let currentY = padding + topMargin;
        const usableHeightS = internalHeight - (sourceEntries.length * nodeGap);
        sourceEntries.forEach(([id, val]) => {
            const h = Math.max((val / totalValue) * (usableHeightS * 0.8), minNodeHeight);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id, name: branch?.name || id, x: padding, y: currentY, height: h,
                color: currentTheme.primary, totalValue: val
            });
            currentY += h + nodeGap;
        });

        currentY = padding + topMargin;
        const usableHeightT = internalHeight - (targetEntries.length * nodeGap);
        targetEntries.forEach(([id, val]) => {
            const h = Math.max((val / totalValue) * (usableHeightT * 0.8), minNodeHeight);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id: id + '_target', name: branch?.name || id, x: width - padding - nodeWidth, y: currentY, height: h,
                color: currentTheme.secondary, totalValue: val
            });
            currentY += h + nodeGap;
        });

        const targetOffsets: Record<string, number> = {};
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
                        source: sourceNode.id, sourceName: sourceBranch?.name || sourceNode.id,
                        target: d.dest, targetName: targetBranch?.name || d.dest,
                        value: d.qty, path, width: linkWidth, color: sourceNode.color,
                        sourceY: y0, targetY: y1
                    });
                    sOffset += linkWidth;
                    targetOffsets[d.dest] += linkWidth;
                }
            });
        });

        return { nodes, links, totalFlow: totalValue === 1 && filteredData.length === 0 ? 0 : totalValue, svgHeight: totalSvgHeight };
    }, [filteredData, currentTheme, width]);

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
                <h3 className={`text-xl font-black flex items-center gap-2`}>
                    <div className="w-2 h-8 rounded-full shadow-lg theme-bg-primary theme-shadow-primary" />
                    <span className={isDarkMode ? 'text-white' : 'text-black'}>{title}</span>
                    {totalFlow > 0 && (
                        <span className="ml-2 text-xs font-bold px-3 py-1 rounded-full shadow-inner theme-bg-soft theme-text-primary">
                            {totalFlow.toLocaleString()} total
                        </span>
                    )}
                </h3>
            </div>

            <div className="relative w-full overflow-x-auto" onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}>
                <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} className="mx-auto">
                    <defs>
                        {links.map((link, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={currentTheme.primary} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={currentTheme.secondary} stopOpacity="0.4" />
                            </linearGradient>
                        ))}
                        <linearGradient id="grad-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={currentTheme.primary} stopOpacity={1} />
                            <stop offset="50%" stopColor={currentTheme.accent || '#ec4899'} stopOpacity={1} />
                            <stop offset="100%" stopColor={currentTheme.secondary} stopOpacity={1} />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {links.map((link, i) => (
                        <motion.path
                            key={`link-${i}`} d={link.path}
                            stroke={hoveredLink === link ? 'url(#grad-highlight)' : `url(#grad-${i})`}
                            strokeWidth={link.width} fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{
                                pathLength: 1,
                                opacity: hoveredLink === link ? 1 : (isLinkHighlighted(link) ? 0.6 : 0.1),
                                strokeWidth: hoveredLink === link ? link.width + 4 : link.width
                            }}
                            onMouseEnter={() => setHoveredLink(link)}
                            onMouseLeave={() => setHoveredLink(null)}
                            className="cursor-pointer transition-all duration-300"
                        />
                    ))}

                    {nodes.map((node, i) => {
                        const highlighted = isNodeHighlighted(node);
                        const isHovered = hoveredNode === node.id || hoveredNode === node.id.replace('_target', '');
                        return (
                            <g key={`node-${i}`} onMouseEnter={() => setHoveredNode(node.id.replace('_target', ''))} onMouseLeave={() => setHoveredNode(null)} className="cursor-pointer">
                                <motion.rect
                                    x={node.x} y={node.y} width={nodeWidth} height={node.height}
                                    fill={isHovered ? (node.id.endsWith('_target') ? '#a855f7' : '#818cf8') : (highlighted ? node.color : 'rgba(100,100,100,0.3)')}
                                    rx={4} initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: node.height, opacity: 1, scale: isHovered ? 1.1 : 1 }}
                                />
                                <text
                                    x={node.x + (node.id.endsWith('_target') ? -8 : nodeWidth + 8)} y={node.y + node.height / 2} dy=".35em"
                                    textAnchor={node.id.endsWith('_target') ? 'end' : 'start'}
                                    className={`text-[10px] font-bold ${isDarkMode ? 'fill-slate-300' : 'fill-slate-700'}`}
                                >
                                    {node.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                <AnimatePresence>
                    {hoveredLink && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className={`absolute pointer-events-none z-50 px-4 py-2 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                            style={{ left: mousePos.x + 20, top: mousePos.y - 40 }}
                        >
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 uppercase">{hoveredLink.sourceName} ➜ {hoveredLink.targetName}</span>
                                <span className="text-sm font-black text-indigo-500">{hoveredLink.value.toLocaleString()} พาเลท</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
