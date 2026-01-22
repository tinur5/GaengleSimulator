import React, { useEffect, useRef } from "react";

type SankeyProps = {
  width?: number;
  height?: number;
  data?: any;
};

export default function SankeyChart({ width = 600, height = 300, data }: SankeyProps) {
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
          .attr("height", height);

        const graph = data ?? {
          nodes: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
          links: [{ source: 0, target: 1, value: 1 }],
        };

        const sankeyGen = d3sankey.sankey()
          .nodeWidth(15)
          .nodePadding(10)
          .extent([[0, 0], [width, height]]);

        const { nodes: nodesOut, links: linksOut } = sankeyGen({
          nodes: graph.nodes.map((n: any) => ({ ...n })),
          links: graph.links.map((l: any) => ({ ...l })),
        });

        svg.append("g")
          .selectAll("path")
          .data(linksOut)
          .enter()
          .append("path")
          .attr("d", d3sankey.sankeyLinkHorizontal())
          .attr("fill", "none")
          .attr("stroke", "#999")
          .attr("stroke-width", (d: any) => Math.max(1, d.width));

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
          .attr("fill", "#0070f3");

        node.append("text")
          .attr("x", (d: any) => d.x0 - 6)
          .attr("y", (d: any) => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "end")
          .text((d: any) => d.name || d.id);

      } catch (e) {
        // log but don't crash the app
        // eslint-disable-next-line no-console
        console.error("Sankey load error:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [width, height, data]);

  return (
    <div style={{ width: "100%", height }} ref={ref} />
  );
}
