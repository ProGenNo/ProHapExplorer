<script lang="ts">
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import type { HistoData } from '../../types/d3_elements';

    //const max_row_width = 50
    let component_width = 10, component_height = 10
    const margin = {
        top: 10,
        right: 20,
        left: 185,
        bottom: 55
    };

    export let id: string
    export let data: Array<HistoData> = []
    export let y_label: string

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        const div_node = (d3.select("#" + id + "-vis-main").node() as HTMLDivElement)
        if (div_node) {
            component_width = div_node.getBoundingClientRect().width - margin.left - margin.right;
            component_height = div_node.getBoundingClientRect().height - margin.top - margin.bottom;
        }

        redraw(data.sort((a, b) => {return a.value - b.value}))
    }

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })
    
    function receive_data(node: HTMLDivElement, param: Array<HistoData>) {
        return {
            update(param: Array<HistoData>) {
                redraw(param.sort((a, b) => {return a.value - b.value}))
            }
        }
    }

    function redraw(new_data: Array<HistoData>) {
        d3.select("#" + id + "-vis-svg").html(null)

        if (data.length === 0) {
            return
        }

        const svg = d3.select("#" + id + "-vis-svg")

        // y: band scale for categories
        const y = d3.scaleBand()
            .range([0, component_height])
            .domain(new_data.map(d => d.label))
            .padding(0.15);

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .attr("font-size", 11);

        // x: linear scale for values
        const maxX = Math.max(...new_data.map(elem => elem.value));
        const x = d3.scaleLinear()
            .domain([0, maxX])
            .range([0, component_width]);

         svg.append("g")
            .attr("transform", "translate(0," + component_height + ")")
            .call(d3.axisBottom(x).ticks(Math.min(7, Math.max(3, maxX))))
            .selectAll("text")
            .attr("font-size", 12);

        // Draw horizontal bars
        svg.append('g').selectAll('rect').data(new_data).enter().append('rect')
            .attr('y', d => y(d.label)!)
            .attr('x', 0)
            .attr('height', y.bandwidth())
            .attr('width', d => x(d.value))
            .attr("fill", "#69b3a2");

        //svg.append('text').attr("transform", "translate(-35," + (margin.top + component_height/2) + ")rotate(-90)").attr('y', 0).attr('x', 0).text(y_label).attr("font-size", 12)
    }
</script>

<style>
    .histo-basic {
        height: 50vh;
        width: 100%;
    }
</style>

<div id={id + "-vis-main"} class="histo-basic" use:receive_data={data} >
    <svg width={component_width + margin.left + margin.right} height={component_height + margin.top + margin.bottom} >
        <g id={id + "-vis-svg"} transform={"translate(" + margin.left + "," + margin.top + ")"}>
        </g>
        <text transform={'translate(' + (margin.left + component_width/2) + ',' + (margin.top + component_height + margin.bottom*0.7) + ")"} text-anchor="middle">{y_label}</text>
    </svg>
</div>
