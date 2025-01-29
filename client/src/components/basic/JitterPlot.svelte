<script lang="ts">
    import * as d3 from 'd3'
    import { onMount } from 'svelte';

    export let data: number[] = [];
    export let x_label: string = "";
    export let x_max: number;
    let vis: HTMLDivElement; // binding with div for visualization
    let width: number = 10;
    let height:number = 10;

    const margin = {
        top: 5,
        right: 10,
        bottom: 40,
        left: 5
    };

    function dataReceived(node: HTMLDivElement, param: number[]) {
        return {
            update(param: number[]) {
                redraw()
            }
        }
    }

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        const elem_node = d3.select(vis).node()
        if (elem_node) {
            width = elem_node.getBoundingClientRect().width - margin.left - margin.right;
            height = elem_node.getBoundingClientRect().height - margin.top - margin.bottom;
        }

        redraw()
    }

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    function redraw() {
		// empty vis div
		d3.select(vis).html(null); 

        if (data.length === 0) {
            return
        }
        
        // create svg and create a group inside that is moved by means of margin
		const svg_vis = d3.select(vis)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height',  height + margin.top + margin.bottom)
			.append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        
        const x_lin = d3.scaleLinear().domain([0, x_max]).range([0,width])
        //const y = d3.scaleLinear().domain([0, 1]).range([height, 0])
        const circle_r = 4

        // add uniform jitter
        const plot_data = data.map(d => [d, Math.random() * (height - 4*circle_r) + (2*circle_r)])

        svg_vis.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x_lin))

        svg_vis
            .append('text')
            .attr('x', width/2)
            .attr('y', height + 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .text(x_label)

        svg_vis.append('g')
            .selectAll('jitterPoint')
            .data(plot_data)
            .enter()
            .append('circle')
            .attr('cx', (d) => x_lin(d[0]))
            .attr('cy', (d) => d[1])
            .attr('r', circle_r)
            .attr('stroke', 'none')
            .attr('fill', 'black')
            .attr('opacity', ".6")
    }
</script>

<style>
    .jitterplot {
        width: 100%;
        height: 100%;
    }
</style>

<div bind:this={vis} use:dataReceived={data} class="jitterplot"></div>