<script lang="ts">
    import * as d3 from 'd3';
    import DropdownSimple from '../basic/DropdownSimple.svelte'
    import { filteredPeptides, displayPSMs, highlightVariable, highlightValues } from '../../stores/stores';
    import { onMount, onDestroy } from 'svelte';
    import type { Peptide } from '../../types/graph_nodes';
    import type { D3RectElem, D3TextElem, HistoData } from '../../types/d3_elements';    

    // ---------- HISTOGRAM ----------
    let vis: HTMLDivElement;            // binding with div for visualization
    let vis_axis: HTMLDivElement;
    let width = 10
    let height = 10

    const margin = {
        top: 10,
        right: 20,
        bottom: 20,
        left: 10
    };

    enum AggregateVar {
        PSM = 'PSMs',
        Pep = 'Peptides',
        Sam = 'Samples'
    }
    
    let display_var = "pride_accession"
    let count_var: AggregateVar = AggregateVar.Pep

    let allPeptides: Peptide[] = []
    let histogramData: HistoData[] = []

    let bars: D3RectElem[] = [] 
    let row_labels: string[] = []
    let bar_labels: D3TextElem[] = []
    const rowHeight = 30
    const bar_width_threshold = 40

    const getHistogramData = (peptides: Peptide[]) => {
        let histo_keys: string[] = []
        let already_included: Array<string[]> = []    // only applies if counting peptides or samples instead of PSMs

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
                    if (count_var === AggregateVar.Pep) {
                        already_included.push([pept.id])
                    } else if (count_var === AggregateVar.Sam) {
                        already_included.push([spec.sample.id])
                    }
                } else {
                    switch(count_var){
                        case AggregateVar.PSM: 
                            histogramData[idx].value += 1
                            break
                        case AggregateVar.Pep:
                            if (!already_included[idx].includes(pept.id)) {
                                histogramData[idx].value += 1
                                already_included[idx].push(pept.id)
                            }
                            break
                        case AggregateVar.Sam:
                            if (!already_included[idx].includes(spec.sample.id)) {
                                histogramData[idx].value += 1
                                already_included[idx].push(spec.sample.id)
                            }
                            break                            
                    }
                }
            })
        })

        histogramData.sort((a, b) => b.value - a.value)
    }

    const unsubscribe = filteredPeptides.subscribe(filteredPeptides => {
        allPeptides = [...filteredPeptides.ref, ...filteredPeptides.alt!.filter((pept) => (pept.class_1 != 'canonical'))]

        if (count_var !== AggregateVar.Sam) {
            count_var = filteredPeptides.display_PSMs ? AggregateVar.PSM : AggregateVar.Pep
        }

        getHistogramData(allPeptides)
        redraw()
    })

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    function windowResized(): void {
        // determine width & height of parent element and subtract the margin
        const div_node = d3.select(vis).node()
        if (div_node) {
            width = div_node.getBoundingClientRect().width - margin.left - margin.right;
            height = div_node.getBoundingClientRect().height - margin.top - margin.bottom;
        }

        redraw()
    }

    function redraw(): void {
		// empty vis div
		//d3.select(vis).html(null); 
        d3.select(vis_axis).html(null)

        const nrows = histogramData.length
        //rowHeight = Math.max(Math.min(Math.floor(height / nrows), Math.floor(height * 0.2)), 30)
        //const rowMargin = 2
        const label_width = width * 0.4

        bars = []
        bar_labels = []
        row_labels = []

        const x = d3.scaleLinear()
            .domain([0, d3.max(histogramData, (row => row.value)) as number])     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
            .range([0, width - label_width]);

        d3.select(vis_axis).append('svg').attr('width', x.range()[1]).attr('height', rowHeight+5).attr('width', width - label_width)
                            .append('g').attr("transform", "translate(" + margin.left + ',' + margin.top + ')').call(d3.axisBottom(x).ticks(5))

        histogramData.forEach((row, idx) => {
            const bar_width = x(row.value)
            //const bar_relative_width = bar_width / (x.range()[1])

            bars.push({
                x: margin.left,
                y: margin.top,
                height: rowHeight,
                width: bar_width,
                color_hex: "#69b3a2"
            })

            bar_labels.push({
                x: margin.left + bar_width + (bar_width > bar_width_threshold ? -10 : 10),
                y: margin.top + (rowHeight/2),
                t: row.value.toString(),
                highlight: false,
                anchor: (bar_width > bar_width_threshold ? 'end' : 'start')
            })

            row_labels.push(row.label)
        })
    }

    // ---------- FILTERING / SELECTION LOGIC ----------

    const filter_vars: string[] = [
        'pride_accession',
        'tissue',
        'phenotype'
    ]

    const count_options = Object.values(AggregateVar)

    const handleCountSelect = (event: MouseEvent) => {
        const force_redraw = (count_var === AggregateVar.Sam)
        count_var = (event.target as HTMLElement).id.split("menuItem_")[1] as AggregateVar

        if (count_var !== AggregateVar.Sam) {
            displayPSMs.set(count_var === AggregateVar.PSM)
            // do not redraw as that will be triggered by the subscribed method after the store change
        } 
        
        if (force_redraw || (count_var === AggregateVar.Sam)) {
            getHistogramData(allPeptides)
            redraw()
        }
    }

    const handleFilterSelect = (event: MouseEvent) => {
        display_var = (event.target as HTMLElement).id.split("menuItem_")[1]
        highlightVariable.set(display_var)
        highlightValues.set([])

        d3.select("#histo").selectAll("input[type=checkbox]").property("checked", false)

        getHistogramData(allPeptides)
        redraw()
    }

    const handleHighlightClick = (event: MouseEvent) => {
        const label = histogramData[parseInt((event.target as HTMLInputElement).id.split('filter_')[1])].label
        let currentSelection = $highlightValues

        if ((event.target as HTMLInputElement).checked) {
            currentSelection.push(label)
        } else {
            currentSelection.splice(currentSelection.indexOf(label), 1)
        }

        highlightValues.set(currentSelection)
    }

    onDestroy(unsubscribe)
</script>


<style>
    #histo {
        max-height: 25vh;
        display: grid;
        gap: 10px;
        grid-template-columns: 1fr;
        align-items: flex-start;
        align-content: flex-start;
        overflow-y: scroll;
        overflow-x: hidden;
    }

    #axis {
        display: grid;
        grid-template-columns: 1fr;
        align-items: flex-start;
        align-content: flex-start;
    }

    .histo-row{
        display: grid;
        gap: 5px;
        grid-template-columns: 1fr 6fr 10fr;
        align-items: center;
    }
</style>

<div id='sidebar-filter hidescrollbar'>
    <div id='sidebar-filter-selector' class="grid grid-cols-2 ml-2 mt-1 gap-1">        
        <div class="flex items-stretch">
            <span class='align-middle mr-2'>Highlight by:</span>
            <DropdownSimple allItems={filter_vars} handleSelect={handleFilterSelect} selectedItem={display_var} />
        </div>
        <div class="flex items-stretch">
            <span class='align-middle mr-2'>Aggregate by:</span>
            <DropdownSimple allItems={count_options} handleSelect={handleCountSelect} selectedItem={count_var} />
        </div>
    </div>
    <div id='histo' bind:this={vis} class="hidescrollbar">
        { #each bars as barElem, index }
            <div class='histo-row hidescrollbar'>
                <div class='self-center justify-self-end ml-1 mr-1'>
                    <input type="checkbox" id={"filter_" + index} name={"filter_" + index} value="FilterHaplotypes" on:click={handleHighlightClick} checked={$highlightValues.includes(row_labels[index])}>
                </div>
                <div class='justify-self-end'>
                    <span class='align-middle'>{row_labels[index]}</span>
                </div>
                <div class='justify-self-start'>
                    <svg height={rowHeight}>
                        <g>
                            <rect x={barElem.x} y={barElem.y} width={barElem.width} height={barElem.height} stroke="none" fill={barElem.color_hex}></rect>
                            <text x={bar_labels[index].x} y={bar_labels[index].y} text-anchor={bar_labels[index].anchor}>{bar_labels[index].t}</text>
                        </g>
                    </svg>
                </div>
            </div>
        { /each }
    </div>
    <div id='axis'>
        { #if (bars.length > 0) }
            <div class='histo-row'>
                <div></div>
                <div class='justify-self-end'>
                    <span class='align-middle'># {count_var}</span>
                </div>
                <div class='justify-self-start' bind:this={vis_axis}>
                </div>
            </div>
        { /if }
    </div>
</div>