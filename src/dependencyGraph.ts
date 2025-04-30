export async function getDependencyGraphWebviewContent(dependencyMap: { [key: string]: string[] }) {
    const nodes = new Set<string>();
    const links: { source: string, target: string }[] = [];

    for (const [file, deps] of Object.entries(dependencyMap)) {
        nodes.add(file);
        for (const dep of deps) {
            const match = Object.keys(dependencyMap).find(f => f.endsWith(dep));
            if (match) {
                nodes.add(match);
                links.push({ source: file, target: match });
            }
        }
    }

    const nodeArray = Array.from(nodes);
    const graphData = {
        nodes: nodeArray.map(id => ({
            id,
            short: id.split('/').pop(),
            type: id.endsWith('.cpp') ? 'cpp' : 'header',
            group: id.split('/').slice(0, -1).join('/') // folder path
        })),
        links: links.map(link => ({
            source: link.source,
            target: link.target
        }))
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { margin: 0; font-family: Arial, sans-serif; overflow: hidden; }
        .tooltip {
            position: absolute;
            background-color: white;
            padding: 6px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            pointer-events: none;
            font-size: 13px;
            color: black;
        }
        #exportBtn {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            background: #007acc;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        svg {
            background-color: white;
        }
    </style>
</head>
<body>
    <button id="exportBtn">Export PNG</button>
    <svg width="100%" height="100vh"></svg>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();
        const graph = ${JSON.stringify(graphData)};
        const svg = d3.select("svg");
        const width = window.innerWidth;
        const height = window.innerHeight;

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        const groupColor = d3.scaleOrdinal(d3.schemePaired);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", (event) => {
                svgGroup.attr("transform", event.transform);
            });

        svg.call(zoom);

        const svgGroup = svg.append("g");

        const simulation = d3.forceSimulation(graph.nodes)
            .force("link", d3.forceLink(graph.links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svgGroup.append("g")
            .attr("stroke", "#aaa")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(graph.links)
            .enter().append("line")
            .attr("stroke-width", 1.5);

        const node = svgGroup.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .enter().append("g")
            .attr("class", "node")
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(d.id)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(300).style("opacity", 0);
            })
            .on("click", (event, d) => {
                vscode.postMessage({ command: 'openFile', filePath: d.id });
            });

        node.append("circle")
            .attr("r", 10)
            .attr("fill", d => d.type === 'cpp' ? "#1f77b4" : "#ff7f0e")
            .attr("stroke", d => groupColor(d.group))
            .attr("stroke-width", 2);

        node.append("text")
            .attr("x", 12)
            .attr("dy", "0.35em")
            .style("font-size", "14px")
            .style("fill", "#333")
            .text(d => d.short);

        // Make nodes draggable
        node.call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => \`translate(\${d.x},\${d.y})\`);
        });

        // Export PNG - Fixed version
        document.getElementById("exportBtn").onclick = () => {
            // Temporarily freeze simulation
            simulation.stop();
            
            // Create a clone of the SVG for export
            const originalSvg = document.querySelector("svg");
            const clonedSvg = originalSvg.cloneNode(true);
            
            // Set explicit width and height on the cloned SVG
            clonedSvg.setAttribute("width", width);
            clonedSvg.setAttribute("height", height);
            clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            
            // Create white background
            const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bgRect.setAttribute("width", "100%");
            bgRect.setAttribute("height", "100%");
            bgRect.setAttribute("fill", "white");
            clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
            
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clonedSvg);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const scaleFactor = 2;
                canvas.width = width * scaleFactor;
                canvas.height = height * scaleFactor;

                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff"; // white background
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
                ctx.drawImage(img, 0, 0);

                URL.revokeObjectURL(url);
                const a = document.createElement("a");
                a.href = canvas.toDataURL("image/png");
                a.download = "dependency-graph.png";
                a.click();
                
                // Resume simulation
                simulation.restart();
            };
            img.src = url;
        };
    </script>
</body>
</html>`;
}