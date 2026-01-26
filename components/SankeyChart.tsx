import React, { useEffect, useRef } from "react";

type SankeyProps = {
  width?: number;
  height?: number;
  data?: any;
};

export default function SankeyChart({ width = 800, height = 400, data }: SankeyProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined" || !ref.current) return;
      try {
        const d3 = await import("d3");
        const d3sankey = await import("d3-sankey");
        if (cancelled) return;

        const container = ref.current!;
        container.innerHTML = "";

        const svg = d3.select(container)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("background", "#f9fafb")
          .style("border-radius", "8px");

        const graph = data ?? {
          nodes: [
            { id: "pv", name: "🌞 Solaranlage" }, 
            { id: "battery", name: "🔋 Batterie" },
            { id: "grid", name: "⚡ Netz" }
          ],
          links: [
            { source: 0, target: 1, value: 30 },
            { source: 0, target: 2, value: 20 }
          ],
        };

        const sankeyGen = d3sankey.sankey()
          .nodeWidth(12)
          .nodePadding(25)
          .extent([[130, 15], [width - 100, height - 15]]);

        const { nodes: nodesOut, links: linksOut } = sankeyGen({
          nodes: graph.nodes.map((n: any) => ({ ...n })),
          links: graph.links.map((l: any) => ({ ...l })),
        });

        // Draw links with colors
        svg.append("g")
          .selectAll("path")
          .data(linksOut)
          .enter()
          .append("path")
          .attr("d", d3sankey.sankeyLinkHorizontal())
          .attr("fill", "none")
          .attr("stroke", (d: any) => {
            // Color based on source node
            const sourceId = d.source.id || d.source.index;
            if (sourceId === 'pv' || sourceId === 0) return '#f59e0b'; // Orange for PV
            if (sourceId === 'grid' || String(sourceId).includes('grid')) return '#ef4444'; // Red for Grid
            return '#3b82f6'; // Blue for others
          })
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", (d: any) => Math.max(1.5, d.width));

        // Draw nodes
        const node = svg.append("g")
          .selectAll("g")
          .data(nodesOut)
          .enter()
          .append("g");

        node.append("rect")
          .attr("x", (d: any) => d.x0)
          .attr("y", (d: any) => d.y0)
          .attr("height", (d: any) => Math.max(1, d.y1 - d.y0))
          .attr("width", (d: any) => Math.max(1, d.x1 - d.x0))
          .attr("fill", (d: any) => {
            const nodeId = d.id || '';
            if (nodeId.includes('pv')) return '#f59e0b'; // Orange for PV
            if (nodeId.includes('bat')) return '#8b5cf6'; // Purple for Battery
            if (nodeId.includes('wr')) return '#06b6d4'; // Cyan for Inverter
            if (nodeId.includes('grid')) return '#ef4444'; // Red for Grid
            return '#10b981'; // Green for consumers
          })
          .attr("rx", 3);

        node.append("text")
          .attr("x", (d: any) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
          .attr("y", (d: any) => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", (d: any) => d.x0 < width / 2 ? "start" : "end")
          .attr("font-weight", "600")
          .attr("font-size", "13px")
          .attr("fill", "#1f2937")
          .text((d: any) => d.name || d.id);

      } catch (e) {
        console.error("Sankey load error:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [width, height, data]);

  return (
    <div style={{ width: "100%", height }} ref={ref} className="flex items-center justify-center" />
  );
}
