// components/SankeyChart.tsx
'use client';

import { useEffect, useRef } from 'react';

interface SankeyChartProps {
  data: number[]; // net per hour, positive = export, negative = consumption
}

export default function SankeyChart({ data }: SankeyChartProps) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // dynamic import to avoid build-time dependency requirement
      const d3 = await import('d3');
      // types aren't required at runtime
      // @ts-ignore
      const d3sankey = await import('d3-sankey');

    let cancelled = false;

    (async () => {
      try {
        // dynamic imports
        const d3Module = await import('d3');
        const sankeyModule = await import('d3-sankey');

        if (cancelled) return;

        const d3: any = d3Module;
        // support both named and default exports
        const sankeyLib: any = sankeyModule.sankey ? sankeyModule : (sankeyModule.default || sankeyModule);
        const sankey = sankeyLib.sankey;

        const container = ref.current?.parentElement as HTMLElement | null;
        const bbox = container ? container.getBoundingClientRect() : { width: 800, height: 360 };
        const width = Math.max(300, Math.floor(bbox.width));
        const height = Math.max(200, Math.floor(bbox.height || 360));

        const hours = data.map((_, i) => `H${i}`);
        const nodes = [...hours, 'Export', 'Consumption'].map(id => ({ id }));

        const links = data.map((v, i) => ({
          source: `H${i}`,
          target: v >= 0 ? 'Export' : 'Consumption',
          value: Math.abs(v),
        })).filter(l => l.value > 0);

        const layout = sankey()
          .nodeId((d: any) => d.id)
          .nodeWidth(18)
          .nodePadding(10)
          .extent([[1, 1], [width - 1, height - 6]]);

        const graph = layout({ nodes: nodes.map(d => ({ ...d })), links: links.map(l => ({ ...l })) });

        const svg = d3.select(ref.current as any);
        svg.selectAll('*').remove();

        const color = d3.scaleOrdinal(d3.schemeCategory10 as any);

        const g = svg
          .attr('viewBox', `0 0 ${width} ${height}`)
          .append('g');

        g.append('g')
          .selectAll('rect')
          .data(graph.nodes)
          .join('rect')
          .attr('x', (d: any) => d.x0)
          .attr('y', (d: any) => d.y0)
          .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
          .attr('width', (d: any) => Math.max(1, d.x1 - d.x0))
          .attr('fill', (d: any, i: number) => color(i as any));

        g.append('g')
          .attr('fill', 'none')
          .selectAll('path')
          .data(graph.links)
          .join('path')
          .attr('d', sankeyLib.sankeyLinkHorizontal ? sankeyLib.sankeyLinkHorizontal() : (() => ''))
          .attr('stroke', '#888')
          .attr('stroke-width', (d: any) => Math.max(1, d.width))
          .attr('opacity', 0.7);

        g.append('g')
          .style('font', '10px sans-serif')
          .selectAll('text')
          .data(graph.nodes)
          .join('text')
          .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
          .attr('y', (d: any) => (d.y1 + d.y0) / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
          .text((d: any) => `${d.id}`);

      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Sankey render error:', err);
      }
    })();

    return () => { cancelled = true; };
