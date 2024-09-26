// Select the SVG canvas and get its dimensions
const svg = d3.select("#voronoiCanvas");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Initialize an empty array to store points
let points = [];

// Create separate layers for Voronoi cells and points for better organization
const cellLayer = svg.append('g');
const pointLayer = svg.append('g');

// Define a color scale for Voronoi cells based on area using enhanced HSL interpolation
const colorInterpolator = d3.interpolateHsl("hsl(0, 60%, 70%)", "hsl(120, 60%, 70%)"); // Light Red to Light Green
let colorScale = d3.scaleLinear()
    .range([0, 1]); // Will set domain based on cell areas

// Append tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("visibility", "hidden");

// Click handler for adding points
svg.on("click", function(event) {
    // Only add a point if the click is not on an existing circle
    if (event.target.tagName !== 'circle') {
        const [x, y] = d3.pointer(event);
        points.push([x, y]);
        drawVoronoi();
    }
});

// Function to calculate polygon area
function calculateArea(polygon) {
    return Math.abs(d3.polygonArea(polygon));
}

// Function to draw or update the Voronoi diagram
function drawVoronoi() {
    // If there are no points, clear the canvas
    if (points.length === 0) {
        cellLayer.selectAll("path").remove();
        pointLayer.selectAll("circle").remove();
        return;
    }

    // Create Delaunay triangulation and Voronoi diagram
    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Prepare data with point coordinates and their indices
    const pointsWithIndex = points.map((point, index) => ({ point, index }));

    // Calculate areas of all Voronoi cells
    const cellAreas = pointsWithIndex.map(d => {
        const cellPolygon = voronoi.cellPolygon(d.index);
        if (cellPolygon && d3.polygonArea(cellPolygon) !== undefined) {
            return calculateArea(cellPolygon);
        } else {
            return 0; // Assign zero area to degenerate cells
        }
    });

    // Determine the minimum and maximum cell areas
    const minArea = d3.min(cellAreas);
    const maxArea = d3.max(cellAreas);

    // Update the color scale domain based on cell areas
    if (minArea < maxArea) {
        colorScale.domain([minArea, maxArea]);
    } else {
        // When all cells have the same area (e.g., single cell), map to green (1)
        colorScale.domain([minArea, minArea + 1]); // Add a small buffer to prevent domain collapse
    }

    // Bind data for Voronoi cells
    const cellPaths = cellLayer.selectAll("path")
        .data(pointsWithIndex, d => d.index);

    // Remove exiting cells
    cellPaths.exit().remove();

    // Update existing cells
    cellPaths
        .attr("d", d => voronoi.renderCell(d.index))
        .attr("fill", (d, i) => {
            const scaledValue = colorScale(cellAreas[i]);
            // If minArea === maxArea, clamp the value to 1 to ensure it maps to green
            return colorInterpolator(minArea === maxArea ? 1 : scaledValue);
        })
        .attr("stroke", "#000")
        .on("mouseover", function(event, d, i) {
            const area = cellAreas[i].toFixed(2);
            tooltip.style("visibility", "visible")
                .text(`Area: ${area}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Add new cells
    cellPaths.enter()
        .append("path")
        .attr("d", d => voronoi.renderCell(d.index))
        .attr("fill", (d, i) => {
            const scaledValue = colorScale(cellAreas[i]);
            return colorInterpolator(minArea === maxArea ? 1 : scaledValue);
        })
        .attr("stroke", "#000")
        .on("mouseover", function(event, d, i) {
            const area = cellAreas[i].toFixed(2);
            tooltip.style("visibility", "visible")
                .text(`Area: ${area}`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
        });

    // Bind data for points (circles)
    const circles = pointLayer.selectAll("circle")
        .data(pointsWithIndex, d => d.index);

    // Remove exiting points
    circles.exit().remove();

    // Update existing points
    circles
        .attr("cx", d => d.point[0])
        .attr("cy", d => d.point[1]);

    // Add new points
    circles.enter()
        .append("circle")
        .attr("cx", d => d.point[0])
        .attr("cy", d => d.point[1])
        .attr("r", 5)
        .on("click", function(event, d) {
            event.stopPropagation(); // Prevent adding a new point when removing
            points.splice(d.index, 1); // Remove the point from the array
            drawVoronoi(); // Redraw the Voronoi diagram
        });
}

// Reset button handler
document.getElementById('resetButton').addEventListener('click', function() {
    points = [];
    drawVoronoi();
});

// Export button handler
document.getElementById('exportButton').addEventListener('click', function() {
    let source = new XMLSerializer().serializeToString(svg.node());

    // Add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Add XML declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "voronoi_cells.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Initial draw in case there are pre-existing points
drawVoronoi();
