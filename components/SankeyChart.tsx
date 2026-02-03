import React, { useEffect, useRef, useState } from "react";

type SankeyProps = {
  width?: number;
  height?: number;
  data?: any;
  minHeight?: number;
};

// Define consistent breakpoint for mobile
const MOBILE_BREAKPOINT = 768;

// Dynamic height calculation constants
const DEFAULT_NODE_COUNT = 8;
const MOBILE_NODE_SPACING = 40;
const DESKTOP_NODE_SPACING = 60;
const VERTICAL_PADDING = 30;
const MAX_MOBILE_HEIGHT = 400;
const MAX_DESKTOP_HEIGHT = 600;

export default function SankeyChart({ width = 800, height = 400, data, minHeight = 250 }: SankeyProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Calculate dynamic height based on number of nodes
  const calculateHeight = (nodeCount: number, containerWidth: number) => {
    const isMobile = containerWidth < MOBILE_BREAKPOINT;
    // Base calculation: each node needs approximately 40-60px of vertical space
    const nodeSpacing = isMobile ? MOBILE_NODE_SPACING : DESKTOP_NODE_SPACING;
    const baseHeight = Math.max(minHeight, nodeCount * nodeSpacing);
    // Add some padding for margins
    const calculatedHeight = baseHeight + VERTICAL_PADDING;
    // Cap at a reasonable maximum to prevent extremely tall diagrams
    const maxHeight = isMobile ? MAX_MOBILE_HEIGHT : MAX_DESKTOP_HEIGHT;
    return Math.min(calculatedHeight, maxHeight);
  };

  // Update dimensions on resize with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const updateDimensions = () => {
      if (ref.current) {
        const containerWidth = ref.current.offsetWidth;
        const nodeCount = data?.nodes?.length || DEFAULT_NODE_COUNT;
        const calculatedHeight = calculateHeight(nodeCount, containerWidth);
        setDimensions({
          width: containerWidth || width,
          height: calculatedHeight
        });
      }
    };

    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 150);
    };

    updateDimensions();
    window.addEventListener('resize', debouncedUpdate);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, [width, height, data]);

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

        const actualWidth = dimensions.width;
        const actualHeight = dimensions.height;

        const svg = d3.select(container)
          .append("svg")
          .attr("width", actualWidth)
          .attr("height", actualHeight)
          .attr("viewBox", `0 0 ${actualWidth} ${actualHeight}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .style("background", "#f9fafb")
          .style("border-radius", "8px")
          .style("width", "100%")
          .style("height", "100%");

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

        const isMobile = actualWidth < MOBILE_BREAKPOINT;
        const leftMargin = isMobile ? 80 : 130;
        const rightMargin = isMobile ? 60 : 100;
        const nodeWidth = isMobile ? 8 : 12;
        const nodePadding = isMobile ? 15 : 25;
        const fontSize = isMobile ? 10 : 13;

        const sankeyGen = d3sankey.sankey()
          .nodeWidth(nodeWidth)
          .nodePadding(nodePadding)
          .extent([[leftMargin, 15], [actualWidth - rightMargin, actualHeight - 15]]);

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
          .attr("x", (d: any) => (d.x0 < actualWidth / 2 ? d.x1 + 6 : d.x0 - 6))
          .attr("y", (d: any) => (d.y1 + d.y0) / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", (d: any) => d.x0 < actualWidth / 2 ? "start" : "end")
          .attr("font-weight", "600")
          .attr("font-size", `${fontSize}px`)
          .attr("fill", "#1f2937")
          .text((d: any) => d.name || d.id);

        // Add link labels showing flow values (simplified condition for clarity)
        // Show labels on screens wider than mobile breakpoint
        if (actualWidth >= MOBILE_BREAKPOINT) {
          svg.append("g")
            .selectAll("text")
            .data(linksOut.filter((d: any) => d.value > 0.5)) // Only show labels for significant flows
            .enter()
            .append("text")
            .attr("x", (d: any) => {
              const sourceX = d.source.x1;
              const targetX = d.target.x0;
              return (sourceX + targetX) / 2;
            })
            .attr("y", (d: any) => {
              const sourceY = (d.source.y0 + d.source.y1) / 2;
              const targetY = (d.target.y0 + d.target.y1) / 2;
              return (sourceY + targetY) / 2;
            })
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("fill", "#374151")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", "3")
            .attr("paint-order", "stroke")
            .text((d: any) => `${(d.value / 10).toFixed(1)} kW`);
        }

      } catch (e) {
        console.error("Sankey load error:", e);
      }
    })();

    return () => { cancelled = true; };
  }, [dimensions.width, dimensions.height, data]);

  return (
    <div style={{ width: "100%", height: dimensions.height, maxWidth: "100%", overflow: "hidden" }} ref={ref} className="flex items-center justify-center" />
  );
}
