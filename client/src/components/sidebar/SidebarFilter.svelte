<script lang="ts">
    import * as d3 from 'd3';
    import Dropdown from "../basic/Dropdown.svelte";
    import { filteredPeptides } from '../../stores/stores';
    import { onMount, onDestroy } from 'svelte';
    import type { Peptide } from '../../types/graph_nodes';
    import type { D3RectElem, D3TextElem } from '../../types/d3_elements';

    // ---------- HISTOGRAM ----------
    let vis: HTMLDivElement;            // binding with div for visualization
    let width = 10
    let height = 10

    const margin = {
        top: 10,
        right: 20,
        bottom: 20,
        left: 10
    };
    
    interface HistoData {
        label: string,
        value: number
    }

    let allPeptides: Peptide[] = []
    let display_var = "pride_accession"
    let histogramData: HistoData[] = []

    const getHistogramData = (peptides: Peptide[]) => {
        let histo_keys: string[] = []
        histogramData = []

        peptides.forEach((pept) => {
            pept.matching_spectra.forEach(spec => {
                const sample_category: string = spec.sample[display_var]
                const idx = histo_keys.findIndex(elem => elem === sample_category)
                if (idx === -1) {
                    histogramData.push({
                        label: sample_category,
                        value: 1
                    })
                    histo_keys.push(sample_category)
                } else {
                    histogramData[idx].value += 1
                }
            })
        })
    }

    const unsubscribe = filteredPeptides.subscribe(filteredPeptides => {
        allPeptides = [...filteredPeptides.ref, ...filteredPeptides.alt!.filter((pept) => (pept.class_1 != 'canonical'))]
        getHistogramData(allPeptides)
        redraw()
    })

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
		width = d3.select(vis).node()!.getBoundingClientRect().width - margin.left - margin.right;
		height = d3.select(vis).node()!.getBoundingClientRect().height - margin.top - margin.bottom;

        redraw()
    }

    function redraw(): void {
		// empty vis div
		d3.select(vis).html(null); 

        const nrows = histogramData.length
        const rowHeight = Math.max(Math.min(Math.floor(height / nrows), Math.floor(height * 0.2)), 15)
        const rowMargin = 2
        const label_width = width * 0.4

        const x = d3.scaleLinear()
            .domain([0, d3.max(histogramData, (row => row.value)) as number])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
            .range([0, width - label_width]);

        let bars: D3RectElem[] = [] 
        let row_labels: D3TextElem[] = []
        let bar_labels: D3TextElem[] = []

        histogramData.forEach((row, idx) => {
            const bar_width = x(row.value)
            const bar_relative_width = bar_width / (x.range()[1])

            bars.push({
                x: margin.left,
                y: margin.top + ((idx) * (rowHeight + rowMargin)),
                height: rowHeight,
                width: bar_width,
                color_hex: "#69b3a2"
            })

            bar_labels.push({
                x: margin.left + bar_width + (bar_width > 40 ? -20 : 10),
                y: margin.top + ((idx) * (rowHeight + rowMargin)) + (rowHeight/2),
                t: row.value.toString(),
                highlight: false,
                anchor: (bar_width > 40 ? 'end' : 'start')
            })

            row_labels.push({
                x: label_width,
                y: margin.top + ((idx) * (rowHeight + rowMargin)) + (rowHeight/2),
                t: row.label,
                highlight: false,
                anchor: "end"
            })
        })

        const svg_vis = d3.select(vis)
            .append('svg')
            .attr('width', width)
            .attr('height',  height)
            .append('g')

        svg_vis.append('g').selectAll('bar')
            .data(bars)
            .enter()
            .append('rect')
            .attr('x', (d) => d.x + label_width)
            .attr('y', (d) => d.y)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)

        svg_vis.append('g').selectAll('bar-label')
            .data(bar_labels)
            .enter()
            .append('text')
            .attr('x', (d) => d.x + label_width)
            .attr('y', (d) => d.y)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .attr('text-anchor', (d) => d.anchor!)
            .text((d) => d.t)

        svg_vis.append('g').selectAll('row-label')
            .data(row_labels)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .attr('text-anchor', (d) => d.anchor!)
            .text((d) => d.t)
    }

    // ---------- FILTERING / SELECTION LOGIC ----------

    const filter_vars: string[] = [
        'pride_accession',
        'tissue',
        'phenotype'
    ]

    const handleSelect = (event: MouseEvent) => {
        display_var = (event.target as HTMLElement).id.split("menuItem_")[1]
        getHistogramData(allPeptides)
        redraw()
    }

    const handleDeselect = () => {
        display_var = "pride_accession"
        getHistogramData(allPeptides)
        redraw()
    }

    onDestroy(unsubscribe)
</script>


<style>
    #histo {
        height: 30vh;
    }
</style>

<div id='sidebar-filter'>
    <div id='sidebar-filter-selector' class="flex grow ml-2 mt-1">
        <Dropdown allItems={filter_vars} handleSelect={handleSelect} handleClear={handleDeselect} selectedItem={display_var} />
    </div>
    <div id='histo' bind:this={vis}></div>
</div>