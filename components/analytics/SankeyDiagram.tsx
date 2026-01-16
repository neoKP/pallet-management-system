import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BranchId } from '../../types';
import { BRANCHES } from '../../constants';

interface SankeyNode {
    id: string;
    name: string;
    x: number;
    y: number;
    height: number;
    color: string;
}

interface SankeyLink {
    source: string;
    target: string;
    value: number;
    path: string;
    width: number;
    color: string;
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
    const width = 800;
    const height = 400;
    const nodeWidth = 20;
    const padding = 40;

    const { nodes, links } = useMemo(() => {
        // Find unique source and destination nodes
        const sources = Array.from(new Set(data.map(d => d.source)));
        const targets = Array.from(new Set(data.map(d => d.dest)));

        // Filter out same source/target if they are just placeholders
        const filteredData = data.filter(d => d.source !== d.dest && d.qty > 0);

        // Calculate total value per node
        const sourceTotals: Record<string, number> = {};
        const targetTotals: Record<string, number> = {};

        filteredData.forEach(d => {
            sourceTotals[d.source] = (sourceTotals[d.source] || 0) + d.qty;
            targetTotals[d.dest] = (targetTotals[d.dest] || 0) + d.qty;
        });

        const totalValue = Object.values(sourceTotals).reduce((a, b) => a + b, 0);

        // Position nodes
        const nodes: SankeyNode[] = [];
        const links: SankeyLink[] = [];

        // Source Nodes (Left)
        let currentY = padding;
        const sourceEntries = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1]);
        sourceEntries.forEach(([id, val]) => {
            const h = (val / totalValue) * (height - padding * 2);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id,
                name: branch?.name || id,
                x: padding,
                y: currentY,
                height: h,
                color: '#6366f1'
            });
            currentY += h + 10;
        });

        // Target Nodes (Right)
        currentY = padding;
        const targetEntries = Object.entries(targetTotals).sort((a, b) => b[1] - a[1]);
        targetEntries.forEach(([id, val]) => {
            const h = (val / totalValue) * (height - padding * 2);
            const branch = BRANCHES.find(b => b.id === id);
            nodes.push({
                id: id + '_target',
                name: branch?.name || id,
                x: width - padding - nodeWidth,
                y: currentY,
                height: h,
                color: '#8b5cf6'
            });
            currentY += h + 10;
        });

        // Create Links
        nodes.filter(n => !n.id.endsWith('_target')).forEach(sourceNode => {
            let sOffset = 0;
            filteredData.filter(d => d.source === sourceNode.id).forEach(d => {
                const targetNode = nodes.find(n => n.id === d.dest + '_target');
                if (targetNode) {
                    const linkWidth = (d.qty / sourceNode.height) * sourceNode.height * (sourceNode.height / (sourceTotals[sourceNode.id] || 1));

                    // Simple path for now: horizontal curve
                    const x0 = sourceNode.x + nodeWidth;
                    const y0 = sourceNode.y + sOffset + linkWidth / 2;
                    const x1 = targetNode.x;
                    const y1 = targetNode.y + (linkWidth / 2); // simplified offset

                    const path = `M${x0},${y0} C${(x0 + x1) / 2},${y0} ${(x0 + x1) / 2},${y1} ${x1},${y1}`;

                    links.push({
                        source: sourceNode.id,
                        target: d.dest,
                        value: d.qty,
                        path,
                        width: linkWidth,
                        color: sourceNode.color
                    });
                    sOffset += linkWidth;
                }
            });
        });

        return { nodes, links };
    }, [data, width, height]);

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
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                    {title}
                </h3>
                <span className="text-xs font-medium opacity-50 uppercase tracking-widest">Source ➜ Destination</span>
            </div>

            <div className="relative w-full overflow-x-auto">
                <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
                    <defs>
                        {links.map((link, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Links */}
                    {links.map((link, i) => (
                        <motion.path
                            key={`link-${i}`}
                            d={link.path}
                            stroke={`url(#grad-${i})`}
                            strokeWidth={link.width}
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, delay: i * 0.1 }}
                            whileHover={{ strokeOpacity: 0.8 }}
                            className="cursor-pointer transition-opacity"
                        />
                    ))}

                    {/* Nodes */}
                    {nodes.map((node, i) => (
                        <g key={`node-${i}`}>
                            <motion.rect
                                x={node.x}
                                y={node.y}
                                width={nodeWidth}
                                height={node.height}
                                fill={node.color}
                                rx={4}
                                initial={{ height: 0 }}
                                animate={{ height: node.height }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                            />
                            <text
                                x={node.x + (node.id.endsWith('_target') ? -8 : nodeWidth + 8)}
                                y={node.y + node.height / 2}
                                dy=".35em"
                                textAnchor={node.id.endsWith('_target') ? 'end' : 'start'}
                                className={`text-[10px] font-bold ${isDarkMode ? 'fill-slate-400' : 'fill-slate-600'}`}
                            >
                                {node.name}
                            </text>
                            <text
                                x={node.x + (node.id.endsWith('_target') ? -8 : nodeWidth + 8)}
                                y={node.y + node.height / 2 + 12}
                                dy=".35em"
                                textAnchor={node.id.endsWith('_target') ? 'end' : 'start'}
                                className={`text-[8px] opacity-70 ${isDarkMode ? 'fill-slate-500' : 'fill-slate-400'}`}
                            >
                                {/* We could show total value here if needed */}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            <div className="mt-4 flex justify-between text-[10px] font-bold opacity-30 uppercase tracking-widest px-4">
                <span>Shipping Point</span>
                <span>Receiving Point</span>
            </div>
        </motion.div>
    );
};
