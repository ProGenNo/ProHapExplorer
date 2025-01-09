<script lang="ts">
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import type { HistoData } from '../../types/d3_elements';

    //const max_row_width = 50
    let component_width = 10, component_height = 10
    const margin = {
        top: 10,
        right: 20,
        bottom: 100,
        left: 55
    };

    export let id: string
    export let data: Array<HistoData> = []
    export let y_label: string

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        component_width = (d3.select("#" + id + "-vis-main").node() as HTMLDivElement).getBoundingClientRect().width - margin.left - margin.right;
        component_height = (d3.select("#" + id + "-vis-main").node() as HTMLDivElement).getBoundingClientRect().height - margin.top - margin.bottom;

        redraw(data.sort((a, b) => {return a.value - b.value}))
    }

    onMount(() => {
        windowResized()
        //testAlignment()
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

        const x = d3.scaleBand().range([0, component_width]).domain(new_data.map(d => d.label)).padding(0.15)
        svg.append("g")
            .attr("transform", "translate(0," + component_height + ")")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .attr("text-anchor", "end")
            .attr("font-size", 12)

        const maxY = Math.max(...new_data.map(elem => elem.value))
        const y = d3.scaleLinear().domain([0, maxY]).range([component_height, 0])
        svg.append('g').call(d3.axisLeft(y).ticks(Math.min(7, Math.max(3, maxY))))

        svg.append('g').selectAll('bar').data(new_data).enter().append('rect')
            .attr('x', d => x(d.label)!)
            .attr('y', d => y(d.value))
            .attr('width', x.bandwidth())
            .attr('height', d => (component_height - y(d.value)))
            .attr("fill", "#69b3a2")

        //svg.append('text').attr("transform", "translate(-35," + (margin.top + component_height/2) + ")rotate(-90)").attr('y', 0).attr('x', 0).text(y_label).attr("font-size", 12)
    }
</script>

<style>
    .histo-basic {
        height: 30vh;
        width: 100%;
    }
</style>

<div id={id + "-vis-main"} class="histo-basic" use:receive_data={data} >
    <svg width={component_width + margin.left + margin.right} height={component_height + margin.top + margin.bottom}>
        <g id={id + "-vis-svg"} transform={"translate(" + margin.left + "," + margin.top + ")"}>
        </g>
        <text transform={'translate(12,' + (margin.top + component_height/2) + ")rotate(-90)"} text-anchor="middle">{y_label}</text>
    </svg>
</div>
