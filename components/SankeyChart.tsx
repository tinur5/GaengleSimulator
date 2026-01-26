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
          .nodeWidth(50)
          .nodePadding(100)
          .extent([[40, 40], [width - 40, height - 40]]);

        const { nodes: nodesOut, links: linksOut } = sankeyGen({
          nodes: graph.nodes.map((n: any) => ({ ...n })),
          links: graph.links.map((l: any) => ({ ...l })),
        });

        // Draw links
        svg.append("g")
          .selectAll("path")
          .data(linksOut)
          .enter()
          .append("path")
          .attr("d", d3sankey.sankeyLinkHorizontal())
          .attr("fill", "none")
          .attr("stroke", "#3b82f6")
          .attr("stroke-opacity", 0.5)
          .attr("stroke-width", (d: any) => Math.max(2, d.width));

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
          .attr("fill", "#10b981")
          .attr("rx", 4);

        node.append("text")
          .attr("x", (d: any) => d.x0 - 10)
          .attr("y", (d: any) => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "end")
          .attr("font-weight", "bold")
          .attr("font-size", "12px")
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
