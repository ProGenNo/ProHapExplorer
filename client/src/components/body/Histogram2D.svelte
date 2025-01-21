<script lang="ts">
    import * as d3 from 'd3';
    import { onDestroy, onMount } from 'svelte';
    import { geneOverview } from '../../stores/stores';
    import { rectbin_gene } from '../../tools/rectbin';
    import type { Gene } from '../../types/graph_nodes';

    let component_width = 10, component_height = 10

    const margin = {
        top: 10,
        right: 20,
        bottom: 90,
        left: 60
    };

    const color_scheme = d3.interpolateYlGn
    let color_scale_limits: [number, number] = [0, 1]

    const nStops = 50
    const stopScale = d3.scaleLinear().domain([0, nStops]).range([0, 1])
    const stops_percent = [...Array(nStops).keys().map(i => stopScale(i))]
    const stop_colors = stops_percent.map(i => color_scheme(i))

    let component_data: Gene[] = []

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        component_width = (d3.select("#overview-2d-hist").node() as HTMLDivElement).getBoundingClientRect().width - margin.left - margin.right;
        component_height = (d3.select("#overview-2d-hist").node() as HTMLDivElement).getBoundingClientRect().height - margin.top - margin.bottom;

        redraw()
    }

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    const unsubscribe = geneOverview.subscribe(data => {
        component_data = data
        redraw()
    })

    onDestroy(unsubscribe)

    function redraw() {
        d3.select("#hist-2d-content").html(null)
        d3.select('#hist-2d-legend-axis').html(null)

        if (component_data.length == 0) {
            return
        }

        const xLim = d3.extent(component_data, d=> d._total_peptides!) as [number, number] // [ Math.min(...component_data.map(elem => elem._variant_peptides!)), Math.max(...component_data.map(elem => elem._variant_peptides!)) ]
        const yLim = d3.extent(component_data, d=> d._variant_peptides!) as [number, number] // [ Math.min(...component_data.map(elem => elem._total_peptides!)), Math.max(...component_data.map(elem => elem._total_peptides!)) ]
        
        const x_bins = Math.min(16, xLim[1])
        const y_bins = Math.min(8, yLim[1])

        const rectbin_data = rectbin_gene(component_data, x_bins, y_bins)

        color_scale_limits = d3.extent(rectbin_data, d=> d.genes.length) as [number, number]

        const svg = d3.select("#hist-2d-content")
                        .attr("transform",
                            "translate(" + margin.left + "," + margin.top + ")");        

        const x = d3.scaleLinear()
                    .nice()
                    .domain(xLim)
                    .rangeRound([0, component_width])
        const y = d3.scaleLinear()
                    .nice()
                    .domain(yLim)
                    .rangeRound([component_height, 0])

        const color_domain = d3.scaleLinear()
                            .nice()
                            .domain([1, color_scale_limits[1]])
                            .range([0, 1])

        const x_axis_g = svg.append('g').attr("transform", "translate(0," + component_height + ")")
        x_axis_g.append('g').append('text').attr('x', Math.floor((component_width/2)) + margin.left).attr('y', 35).attr('text-anchor', 'middle').text('Count of matched peptides')
        x_axis_g.append('g').call(d3.axisBottom(x).ticks(Math.min(xLim[1], 10)))

        const y_axis_g = svg.append('g')
        y_axis_g.append('g').attr('transform', 'translate(-30,' + (Math.floor((component_height/2)) + margin.top) + ')').append('text').attr('x', 0).attr('y', 0).attr('text-anchor', 'middle').attr('transform', 'rotate(-90)').text('# variant peptides')
        y_axis_g.append('g').call(d3.axisLeft(y).ticks(Math.min(yLim[1], 6)))

        const rect_width = Math.floor(component_width / x_bins)
        const rect_height = Math.floor(component_height / y_bins)

        svg.append("g")
            .selectAll("rectBin")
            .data(rectbin_data)
            .enter().append("rect")
                .attr("x", function(d) { return x(d.x_from) })
                .attr("y", function(d) { return y(d.y_from) - rect_height })
                .attr("width", rect_width )
                .attr("height", rect_height )
                .attr("fill", function(d) { return (d.genes.length > 0) ? color_scheme(color_domain(d.genes.length)) : "#FFFFFF"; })
                .attr("stroke", "black")
                .attr("stroke-width", "0.4")

        const color_domain_legend = d3.scaleLinear()
                    .nice()
                    .domain([1, color_scale_limits[1]])
                    .range([0, component_width/3])

        const legend_svg = d3.select('#hist-2d-legend-axis') as d3.Selection<SVGGElement, unknown, HTMLElement, any> //.attr('transform', 'translate(0,' + (component_height + margin.top) + ')')
        legend_svg.call(d3.axisBottom(color_domain_legend).ticks(6))
    }

</script>

<style>
    #overview-2d-hist {
        height: 35vh;
        width: 100%;
    }
</style>

<div>
    <div id="overview-2d-hist">
        <svg id='hist-2d-svg' width={component_width + margin.left + margin.right} height={component_height + margin.top + margin.bottom}>
            <defs>
                <linearGradient id='color-scale-grad' x1='0%' x2='100%' y1='0%' y2='0%'>
                    { #each stop_colors as color, i }
                        <stop offset={Math.round(stops_percent[i] * 100).toString() + '%'} stop-color={color} />
                    { /each }
                </linearGradient>
            </defs>
            <g id='hist-2d-content'></g>
            <g id='hist-2d-legend' transform={'translate(' + margin.left + ',' + (component_height + margin.top + 45) + ')'}>
                <text x=0 y=8>Count of genes:</text>
                <rect x=0 y=15 height="10px" width={component_width / 3} fill="url(#color-scale-grad)" stroke="grey" stroke-width=1></rect>
                <g id="hist-2d-legend-axis" transform="translate(0,25)" stroke="grey"></g>
            </g>
        </svg>
    </div>
</div>