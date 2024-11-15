// Set the dimensions of the SVG container
// Create the SVG canvas
const svg = d3.select("body")
    .append("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight)
    .call(d3.zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", zoomed))
    .append("g");

function zoomed(event) {
  svg.attr("transform", event.transform);
}

window.addEventListener("resize", () => {
  svg.attr("width", window.innerWidth)
      .attr("height", window.innerHeight);
});

const chargeStrengthSlider = document.getElementById('slider-charge-strength');
const chargeStrengthInput = document.getElementById('input-charge-strength');
const collisionRadiusSlider = document.getElementById('slider-collision-radius');
const collisionRadiusInput = document.getElementById('input-collision-radius');
const linkStrengthSlider = document.getElementById('slider-link-strength');
const linkStrengthInput = document.getElementById('input-link-strength');

d3.json("author_network.json").then(data => {
    data.nodes.forEach(node => {
        node.degree = data.links.filter(link => link.source === node.id || link.target === node.id).length;
    });

    const radiusScale = d3.scaleSqrt()
        .domain([d3.min(data.nodes, d => d.degree), d3.max(data.nodes, d => d.degree)])
        .range([3, 12]);
    
    const countryCounts = d3.rollups(data.nodes, v => v.length, d => d.country)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topCountries = new Set(countryCounts.map(d => d[0]));

    const colorScale = d3.scaleOrdinal()
        .domain([...topCountries])
        .range(d3.schemeTableau10);

    const getColorByCountry = (country) => {
        return topCountries.has(country) ? colorScale(country) : "#A9A9A9";
    };

    let simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrengthSlider.value))
        .force("charge", d3.forceManyBody().strength(chargeStrengthSlider.value))
        .force("center", d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
        .force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + parseFloat(collisionRadiusSlider.value)))
        .on("tick", ticked);

    chargeStrengthSlider.addEventListener('input', function() {
        const chargeStrength = parseFloat(chargeStrengthSlider.value);
        chargeStrengthInput.value = chargeStrength;
        simulation.force("charge", d3.forceManyBody().strength(chargeStrength));
        simulation.alpha(1).restart();
    });

    chargeStrengthInput.addEventListener('input', function() {
        const chargeStrength = parseFloat(chargeStrengthInput.value);
        chargeStrengthSlider.value = chargeStrength;
        simulation.force("charge", d3.forceManyBody().strength(chargeStrength));
        simulation.alpha(1).restart();
    });

    collisionRadiusSlider.addEventListener('input', function() {
        const collisionRadius = parseFloat(collisionRadiusSlider.value);
        collisionRadiusInput.value = collisionRadius;
        simulation.force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + collisionRadius));
        simulation.alpha(1).restart();
    });

    collisionRadiusInput.addEventListener('input', function() {
        const collisionRadius = parseFloat(collisionRadiusInput.value);
        collisionRadiusSlider.value = collisionRadius;
        simulation.force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + collisionRadius));
        simulation.alpha(1).restart();
    });

    linkStrengthSlider.addEventListener('input', function() {
        const linkStrength = parseFloat(linkStrengthSlider.value);
        linkStrengthInput.value = linkStrength;
        simulation.force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrength));
        simulation.alpha(1).restart();
    });

    linkStrengthInput.addEventListener('input', function() {
        const linkStrength = parseFloat(linkStrengthInput.value);
        linkStrengthSlider.value = linkStrength;
        simulation.force("link", d3.forceLink(data.links).id(d => d.id).strength(linkStrength));
        simulation.alpha(1).restart();
    });

    function ticked() {
        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);

        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    }

    const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.3)")
    .style("display", "none");

    const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("stroke-width", 1.5);

    const node = svg.selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("r", d => radiusScale(d.degree))
        .attr("fill", d => getColorByCountry(d.country))
        .call(drag(simulation))
        .on("mouseover", function(event, d) {
            node.style("opacity", nodeData =>
                nodeData.country === d.country ? 1 : 0.2
            );
        })
        .on("mouseleave", function() {
            node.style("opacity", 1);
        })
        .on("click", function(event, d) {
            showTooltip(event, d);
            event.stopPropagation();
        });
      
    function showTooltip(event, d) {
      const [x, y] = d3.pointer(event);
      tooltip
          .html(`<strong>Author:</strong> ${d.name}<br><strong>Country:</strong> ${d.country}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px")
          .style("display", "block");
    }

    function hideTooltip() {
      tooltip.style("display", "none");
    }

    document.body.addEventListener("click", function(event) {
      const isClickInsideNode = event.target.tagName === 'circle';
      if (!isClickInsideNode) {
          hideTooltip();
      }
    });
});

function drag(simulation) {
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

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}
