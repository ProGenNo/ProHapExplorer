<script lang="ts">
    import * as d3 from 'd3'
    import { onMount } from 'svelte';

    // Function to compute density
    function kernelDensityEstimator(kernel: (k: number) => number, X: number[]) {
        return function(V: number[]) {
            return X.map(function(x) {
                return [x, d3.mean(V, function(v) { return kernel(x - v); })];
            });
        };
    }

    function kernelEpanechnikov(k: number) {
        return function(v: number) {
            return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
    }

    function dataReceived(node: HTMLDivElement, param: number[]) {
        return {
            update(param: number[]) {
                redraw()
            }
        }
    }

    export let data: number[] = [];
    export let x_label: string = "";
    export let x_max: number;
    export let x_min: number = 0;
    export let rotate_ticks: boolean = false;
    let vis: HTMLDivElement; // binding with div for visualization
    let width: number = 10;
    let height:number = 10;

    const margin = {
        top: 5,
        right: 10,
        bottom: 40,
        left: 5
    };

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

        const x_lin = d3.scaleLinear().domain([x_min, x_max]).range([0,width])
        //const x_log = d3.scaleLog().domain([0,50]).range([0, width])

        const kde = kernelDensityEstimator(kernelEpanechnikov((x_max - x_min) / 40), x_lin.ticks(80))
        const density = kde(data) as [number, number][]

        const y_max = Math.max(...(density.map(elem => elem[1])))
        const y = d3.scaleLinear().domain([0, y_max]).range([height, 0])

        svg_vis.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x_lin))
            .selectAll("text")  
                .style("text-anchor", rotate_ticks ? "end" : "middle")
                .attr("dx", rotate_ticks ? "-.8em" : "0em")
                .attr("dy", rotate_ticks ? ".15em" : ".75em")
                .attr("transform", rotate_ticks ? "rotate(-65)" : "" );

        svg_vis
            .append('text')
            .attr('x', width/2)
            .attr('y', height + (rotate_ticks ? 60: 30))
            .attr('text-anchor', 'middle')
            .attr('font-size', 10)
            .text(x_label)

        // Plot the area
        svg_vis.append("path")
            .attr("class", "mypath")
            .datum(density)
            .attr("fill", "#69b3a2")
            .attr("opacity", ".8")
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
            .attr("stroke-linejoin", "round")
            .attr("d",  d3.line()
                .curve(d3.curveBasis)
                .x(function(d) { return x_lin(d[0]); })
                .y(function(d) { return y(d[1]); })
            );

        svg_vis.append
    }
</script>

<style>
    .densityplot {
        width: 100%;
        height: 100%;
    }
</style>

<div bind:this={vis} use:dataReceived={data} class="densityplot"></div>