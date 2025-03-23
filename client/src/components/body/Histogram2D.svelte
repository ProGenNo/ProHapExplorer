<script lang="ts">
    import * as d3 from 'd3';
    import { onDestroy, onMount } from 'svelte';
    import { geneOverview, geneFilter } from '../../stores/stores';
    import { rectbin_gene } from '../../tools/rectbin';
    import type { Gene, GeneBin } from '../../types/graph_nodes';

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

    let highlight_from: [number, number] = [-1, -1]
    let highlight_to: [number, number] = [-1, -1]
    let mouse_down_coords: number[] = [-1, -1]
    let mouse_down_vals: [[number, number], [number, number]] = [[-1, -1], [-1, -1]]
    let highlight_vals: [[number, number], [number, number]] = [[-1, -1], [-1, -1]]

    let component_data: Gene[] = []

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        const div_node = d3.select("#overview-2d-hist").node() as HTMLDivElement
        if (div_node) {
            component_width = div_node.getBoundingClientRect().width - margin.left - margin.right;
            component_height = div_node.getBoundingClientRect().height - margin.top - margin.bottom;
        }

        redraw()
    }

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    const unsubscribe = geneOverview.subscribe(data => {
        component_data = data.filter((g: Gene) => {
            return ((typeof(g._total_peptides) != "undefined") && (typeof(g._variant_peptides) != "undefined"))
        })

        //console.log(component_data)
        redraw()
    })

    onDestroy(unsubscribe)

    function highlight_rect() {
        d3.select('#highlight-rect')
            .attr('x', (highlight_from[0] == -1) ? 0 : highlight_from[0])
            .attr('y', (highlight_from[1] == -1) ? 0 : highlight_from[1])
            .attr('width', (highlight_from[0] == -1) ? 1 : (highlight_to[0] - highlight_from[0]))
            .attr('height', (highlight_from[1] == -1) ? 1 : (highlight_to[1] - highlight_from[1]))
            .attr('stroke-opacity', (highlight_from[0] == -1) ? 0 : 1)
    }

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

        const color_domain = d3.scaleLog()
                            .base(10)
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
                .attr('oncontextmenu', 'return false;')
                .on('mousedown', (evt: MouseEvent, d: GeneBin) => {
                    highlight_from = [x(d.x_from), y(d.y_to)]
                    highlight_to = [x(d.x_to), y(d.y_from)]

                    mouse_down_coords = [...highlight_from, ...highlight_to]
                    mouse_down_vals = [[d.x_from, d.y_from], [d.x_to, d.y_to]]
                    highlight_vals = mouse_down_vals

                    highlight_rect()
                })
                .on('mouseup', (evt: MouseEvent, d: GeneBin) => {
                    mouse_down_coords = []
                    mouse_down_vals = [[-1, -1], [-1, -1]]
                    geneFilter.set(highlight_vals)
                })
                .on('mousemove', (evt: MouseEvent, d: GeneBin) => {
                    if (mouse_down_coords.length > 0) {
                        highlight_from = [Math.min(x(d.x_from), mouse_down_coords[0]), Math.min(y(d.y_to), mouse_down_coords[1])]
                        highlight_to = [Math.max(x(d.x_to), mouse_down_coords[2]), Math.max(y(d.y_from), mouse_down_coords[3])]

                        highlight_vals = [
                            [Math.min(d.x_from, mouse_down_vals[0][0]), Math.min(d.y_from, mouse_down_vals[0][1])], 
                            [Math.max(d.x_to, mouse_down_vals[1][0]), Math.max(d.y_to, mouse_down_vals[1][1])]
                        ]

                        highlight_rect()
                    }
                }).on('auxclick', (evt: MouseEvent, d: GeneBin) => {
                    evt.preventDefault()

                    mouse_down_coords = []
                    mouse_down_vals = [[-1, -1], [-1, -1]]

                    highlight_from = [-1, -1]
                    highlight_to = [-1, -1]

                    highlight_rect()
                    geneFilter.set([[-1, -1], [-1, -1]])
                })

        svg.append("g")
            .append('rect')
            .attr('id', 'highlight-rect')
            .attr('x', (highlight_from[0] == -1) ? 0 : highlight_from[0])
            .attr('y', (highlight_from[1] == -1) ? 0 : highlight_from[1])
            .attr('width', (highlight_from[0] == -1) ? 1 : (highlight_to[0] - highlight_from[0]))
            .attr('height', (highlight_from[1] == -1) ? 1 : (highlight_to[1] - highlight_from[1]))
            .attr('fill-opacity', 0)
            .attr('stroke-width', 3)
            .attr('stroke', 'black')
            .attr('stroke-opacity', (highlight_from[0] == -1) ? 0 : 1)
            .attr('style', 'pointer-events: none')
            .attr('oncontextmenu', 'return false;')

        const color_domain_legend = d3.scaleLog()
                    .base(10)
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