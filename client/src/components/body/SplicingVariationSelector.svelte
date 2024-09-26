<script lang="ts">
    import * as d3 from 'd3';
    import HaplotypeTable from './HaplotypeTable.svelte';
    import SplicingVariationLegend from './SplicingVariationLegend.svelte';
    // import RangeSlider from "svelte-range-slider-pips";
    import { onDestroy, onMount } from 'svelte';
    import { storeSelection1, selectedTranscriptIdx, selectedVariantIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedHaplotype, availableVariants, protRefSubrgaph, protHapSubrgaph, selectedTranscript as selectedTranscriptStore } from "../../stores/stores.js"
    import { /*testAlignment, */alignExons, getScreenX, mapIntronCoordinates, alignPeptidesExons } from "../../tools/alignExons"
    import { mergeOverlappingRegions } from "../../tools/alignSequences"
    import type { Gene, Exon, Transcript, Variant, Haplotype } from '../../types/graph_nodes'
    import type { SplicingAlignmentRegion } from '../../types/alignment_types'
    import { SplicingRegionType } from '../../types/alignment_types'
    import { parseProteoformSubgraph, addCanonicalPSMs } from "../../tools/parseGraphQueryResult"
    import type { D3CircleElem, D3LineElem, D3RectElem, D3TextElem } from '../../types/d3_elements'

    let filterHaplotypes = false

    let alignment: Array<SplicingAlignmentRegion> = [];
    let nrows: number = 1;
    let vis: HTMLDivElement;            // binding with div for visualization
    let legend_div: HTMLDivElement;     // binding with div for legend and scale
    let component_width: number = 10;
    let component_height: number = 10;
    let selectedGene: Gene;
    let selectedTranscript: Transcript;
    let availableHaplotypes: Array<Haplotype> = [];

    const VariantTypeData = [
        {'hex': '#C1A40D', 'name': 'SNP'},        
        {'hex': '#CB00BE', 'name': 'in-frame insertion / deletion'},
        {'hex': '#980000', 'name': 'frameshift'},
    ]
    
    const margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 30
    };

    const min_row_height = 20
    const max_row_height = 50
    //let zoom_level = 1

    /**
     * CALLBACKS
     */

    // new gene selected
    const unsubscribe = storeSelection1.subscribe((selection) => {
        selectedGene = selection.gene!
        selectedTranscript = selection.transcript!
        availableHaplotypes = selection.availableHaplotypes

        if (!selection.gene || selection.gene.transcripts.length === 0) {    // selection failed
            alignment = []
            nrows = 1
            redraw()
            return
        }

        // aggregate all exons of the gene
        let all_exons: Array<Exon> = []
        selection.gene.transcripts.forEach(transcript => {
            all_exons = [...all_exons, ...transcript.exons]
        })

        // align them to get the x-coordinate mapping
        alignment = alignExons(all_exons, selectedGene.strand)

        // remember how many transcripts we have
        nrows = selectedGene.transcripts.length
        redraw()
        redraw()    // need to draw twice as the first round shows misaligned peptides for some god forsaken reason
    })

    onMount(() => {
        windowResized()
        //testAlignment()
        window.addEventListener('resize', windowResized);
    })

    function windowResized(): void {
		// determine width & height of parent element and subtract the margin
		component_width = d3.select(vis).node()!.getBoundingClientRect().width - margin.left - margin.right;
		component_height = d3.select(vis).node()!.getBoundingClientRect().height - margin.top - margin.bottom;

        redraw()
    }

    async function transcriptClicked(this: SVGTextElement, evt: any) {
        const transcriptIdx = parseInt(this.id.split('_')[1])

        if ($selectedTranscriptIdx !== transcriptIdx) {
            selectedTranscriptIdx.set(transcriptIdx)

            // Canonical protein selected -> query the backend for the peptides and spectra
            await fetch("/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({type: 'Proteoform', value: $selectedTranscriptStore!.canonical_protein.id}),
                })
                .then((r) => r.json())  // parse response to JSON
                .then((data) => {       // parse JSON to objects
                    const parsedData = parseProteoformSubgraph(data, $selectedTranscriptStore!);
                    protRefSubrgaph.set(parsedData);
                });
        } else {
            selectedTranscriptIdx.set(-1)
            protRefSubrgaph.set([])
        }

        selectedHaplotypeIdx.set(-1)
        selectedHaplotypeGroupIdx.set(-1)
        selectedVariantIdx.set(-1)
        protHapSubrgaph.set([])
    }

    function variantClicked(evt: any, d: D3LineElem) : void {
        if (!d.active) {
            return
        }

        const variantIdx = parseInt(d.id!.split('_')[1])

        if ($selectedVariantIdx !== variantIdx) {
            selectedVariantIdx.set(variantIdx)
        } else {
            selectedVariantIdx.set(-1)
        }

        selectedHaplotypeIdx.set(-1)
        selectedHaplotypeGroupIdx.set(-1)
        protHapSubrgaph.set([])
    }

    /**
     * DRAW THE COMPONENT
     */

    function redraw(): void {
		// empty vis div
		 d3.select(vis).html(null); 
		 d3.select(legend_div).html(null); 

        // Check for data availability
        if (!selectedGene) {
            d3.select(vis).html("<span>No gene selected.</span>")
            return
        } else if (selectedGene.transcripts.length === 0) {
            d3.select(vis).html("<span>Selected gene has no available splicing.</span>")
            return
        }

        // Keep the row height within boundaries to avoid overplotting -> rescale the SVG accordingly at the end
        const rowHeight = Math.max(Math.min(Math.floor(component_height / nrows), max_row_height), min_row_height)
        const rowMargin = Math.floor(rowHeight / 5)
        const textWidth = Math.max(150, Math.round(component_width / 10))
        const strand_factor = selectedGene.strand === '+' ? 1 : -1

        // compute the coordinates for all exons and introns
        let exonData: Array<D3RectElem> = []
        let intronData: Array<D3LineElem> = []
        let labelData: Array<D3TextElem> = []
        let startStopData: Array<D3LineElem> = []
        let variantData: Array<D3LineElem> = []
        let variantMarks: Array<D3CircleElem> = []

        selectedGene.transcripts.sort((a,b) => (+(a.MANE_select) * -1)).forEach((transcript: Transcript, row: number) => {

            // place label elements on the screen space
            if (transcript.MANE_select) {
                labelData.push({
                    x: -20,
                    y: Math.floor((row + 0.5) * rowHeight) + 6,
                    t: 'M',
                    id: 'MANE_' + row,
                    highlight: true
                })
            }
            
            labelData.push({
                x: 0,
                y: Math.floor((row + 0.5) * rowHeight) + 6,
                t: transcript.id,
                id: 'transcript_' + row,
                highlight: selectedTranscript ? transcript.id === selectedTranscript.id : false
            })

            // aggregate all the matched peptides for this transcript
            let all_peptides: Array<Array<number>> = []
            transcript.proteoforms.forEach((proteoform) => {
                proteoform.matching_peptides!.forEach((peptide, idx) => {
                    const pep_loc = proteoform.matching_peptide_positions![idx] - proteoform.start_aa
                    all_peptides.push([pep_loc, pep_loc + peptide.sequence.length])
                })
            })
            transcript.canonical_protein.matching_peptides!.forEach((peptide, idx) => {
                const pep_loc = transcript.canonical_protein.matching_peptide_positions![idx] - transcript.canonical_protein.start_aa
                all_peptides.push([pep_loc, pep_loc + peptide.sequence.length])
            })

            const all_peptides_merged = mergeOverlappingRegions(all_peptides)

            // align first start and stop codons
            const xStartPos = transcript.start.length > 0 ? getScreenX(transcript.start[0] * strand_factor, alignment, component_width - textWidth) : 0
            const xStopPos = transcript.stop.length > 0 ? getScreenX(transcript.stop[0] * strand_factor, alignment, component_width - textWidth) : 0

            // align the rest in case there are more, store the properties
            transcript.start.forEach(startPos => {
                const xPos = getScreenX(startPos * strand_factor, alignment, component_width - textWidth)
                startStopData.push({
                    x1: xPos,
                    x2: xPos,
                    y1: row * rowHeight  + Math.floor(rowMargin / 2),
                    y2: (row + 1) * rowHeight - Math.floor(rowMargin / 2),
                    color_hex: "#000000",
                    tooltiptext: "start"
                })
            })
            transcript.stop.forEach(stopPos => {
                const xPos = getScreenX(stopPos * strand_factor, alignment, component_width - textWidth)
                startStopData.push({
                    x1: xPos,
                    x2: xPos,
                    y1: row * rowHeight + Math.floor(rowMargin / 2),
                    y2: (row + 1) * rowHeight - Math.floor(rowMargin / 2),
                    color_hex: "#000000",
                    tooltiptext: "stop"
                })
            })

            // align the exons and peptides
            const screenAlignData = alignPeptidesExons(all_peptides_merged, transcript.exons, transcript.start.length > 0 ? transcript.start[0] : -1, xStartPos, xStopPos, strand_factor, component_width, textWidth, alignment )

            screenAlignData.exons.forEach(exonAligned => {
                exonData.push({
                    x: exonAligned.x,
                    y: row * rowHeight + Math.floor(rowMargin / 2),
                    height: rowHeight - rowMargin,
                    width: exonAligned.width,
                    color_hex: exonAligned.color_hex
                })
            })

            for (let i=0; i < screenAlignData.introns.length; i += 2) {
                 intronData.push({
                    x1: screenAlignData.introns[i],
                    x2: screenAlignData.introns[i+1],
                    y1: Math.floor((row + 0.5) * rowHeight),
                    y2: Math.floor((row + 0.5) * rowHeight),
                    color_hex: "#CECECE"
                 })
            }
        })

        // align all variants, assign color attribute
        selectedGene.variants.forEach((variant: Variant, idx: number) => {
            const lineColor = VariantTypeData[variant.type].hex
            const xPos = getScreenX(variant.location_bp*strand_factor, alignment, component_width - textWidth)
            variantData.push({
                x1: xPos,
                x2: xPos,
                y1: 0,
                y2: nrows * rowHeight,
                color_hex: lineColor,
                id: 'variant_' + idx.toString(),
                active: ($availableVariants.ids.length === 0) || $availableVariants.ids.includes(variant.id),
                tooltiptext: variant.id
            })
            if ($selectedHaplotype && $selectedHaplotype?.included_variants.includes(variant)){
                variantMarks.push({
                    x: xPos,
                    y: 8,
                    r: 3,
                    color_hex: "#b91c1c"
                })
            } else if (variant.found) {
                variantMarks.push({
                    x: xPos,
                    y: 8,
                    r: 3,
                    color_hex: "#15803D"
                })
            }
        })

        // align the axis elements
        let axis_lines: Array<D3LineElem> = []
        let axis_labels: Array<D3TextElem> = []
        let axis_bp_from = alignment[0].from
        
        const skipped_segments = alignment.filter(segment => segment.region_type === SplicingRegionType.Intron_skip)
        const axis_coordinates = mapIntronCoordinates(alignment[0].from, alignment[alignment.length - 1].to, alignment, component_width - textWidth)

        for (let i=0; i < axis_coordinates.length; i += 2) {
            const bp_from = axis_bp_from
            //const bp_to = (Math.floor(i/2) < skipped_segments.length) ? skipped_segments[Math.floor(i/2)].from : alignment[alignment.length - 1].to

            axis_lines.push({
                x1: axis_coordinates[i],
                x2: axis_coordinates[i+1],
                y1: 10,
                y2: 10,
                color_hex: "#000000"
            })

            axis_lines.push({
                x1: axis_coordinates[i],
                x2: axis_coordinates[i],
                y1: 7,
                y2: 13,
                color_hex: "#000000"
            })

            axis_labels.push({
                x: axis_coordinates[i],
                y: (i % 4) === 0 ? 25 : 5,          // alternating labels on top / bottom
                t: (strand_factor * bp_from).toLocaleString(),
                highlight: false,
                anchor: "middle"
            })

            if (i === axis_coordinates.length - 2) {
                axis_labels.push({
                    x: axis_coordinates[i+1],
                    y: (i % 4) === 0 ? 5 : 25,          // alternating labels on top / bottom
                    t: (strand_factor * alignment[alignment.length - 1].to).toLocaleString(),
                    highlight: false,
                    anchor: "end"
                })

                axis_lines.push({
                    x1: axis_coordinates[i+1],
                    x2: axis_coordinates[i+1],
                    y1: 7,
                    y2: 13,
                    color_hex: "#000000"
                })
            }

            axis_bp_from = (Math.floor(i/2) < skipped_segments.length) ? skipped_segments[Math.floor(i/2)].to - 1 : -1
        }

        axis_labels.push({
            x: -textWidth + 15,
            y: 15,          
            t: "Chromosome " + selectedGene.chrom,
            highlight: false,
            anchor: "left"
        })

        const svg_width = component_width
        const svg_height = nrows * rowHeight

        // create svg and create a group inside that is moved by means of margin
		const svg_vis = d3.select(vis)
			.append('svg')
			.attr('width', svg_width + margin.left + margin.right)
			.attr('height',  svg_height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${[margin.left, margin.top]})`)
            .on('mouseout', function() {
                d3.select('#tooltip').style('opacity', 0)   // hide the tooltip on mouseout
            })

        const svg_legend = d3.select(legend_div)
			.append('svg')
			.attr('width', svg_width + margin.left + margin.right)
			.attr('height', 50)
			.append('g')
			.attr('transform', `translate(${[margin.left, margin.top]})`)

        // draw all the stuff
        svg_vis.append('g').selectAll('intron')
            .data(intronData)
            .enter()
            .append('line')
            .attr('x1', (d) => d.x1 + textWidth)
            .attr('x2', (d) => d.x2 + textWidth)
            .attr('y1', (d) => d.y1)
            .attr('y2', (d) => d.y2)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 1.33)

        svg_vis.append('g').selectAll('exon')
			.data(exonData)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x + textWidth)
            .attr('y', (d) => d.y)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)
        
        svg_vis.append('g').selectAll('var-line')
            .data(variantData)
            .enter()
            .append('line')
            .attr('id', (d) => d.id!)
            .attr('x1', (d) => d.x1 + textWidth)
            .attr('x2', (d) => d.x2 + textWidth)
            .attr('y1', (d) => d.y1)
            .attr('y2', (d) => d.y2)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 2)
            .attr('stroke-opacity', (d) => d.active ? "100%" : "30%")
            .attr('cursor', (d) => $selectedTranscriptIdx === -1 ? "default" : d.active ? "pointer" : "default")
            .on('mouseover', function(event, d) {
                d3.select('#tooltip').transition().duration(200).style('opacity', 1).text(d.tooltiptext!)
            })
            .on('mouseout', function() {
                d3.select('#tooltip').style('opacity', 0)
            })
            .on('mousemove', function(event, d) {
                d3.select('#tooltip')
                    .style('left', (event.pageX - 100) + 'px')
                    .style('top', (event.pageY + 10) + 'px')
            })
            .on('click', variantClicked)

        svg_vis.append('g').selectAll('var-mark')
            .data(variantMarks)
            .enter()
            .append('circle')
            .attr('cx', (d) => d.x + textWidth)
            .attr('cy', (d) => d.y - margin.top)
            .attr('r', (d) => d.r)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)
        
        svg_vis.append('g').selectAll('start-stop')
            .data(startStopData)
            .enter()
            .append('line')
            .attr('x1', (d) => d.x1 + textWidth)
            .attr('x2', (d) => d.x2 + textWidth)
            .attr('y1', (d) => d.y1)
            .attr('y2', (d) => d.y2)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                d3.select('#tooltip').transition().duration(200).style('opacity', 1).text(d.tooltiptext!)
            })
            .on('mouseout', function() {
                d3.select('#tooltip').style('opacity', 0)
            })
            .on('mousemove', function(event, d) {
                d3.select('#tooltip')
                    .style('left', (event.pageX - 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px')
            })

        svg_vis.append('g').selectAll('transcript-label')
            .data(labelData)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .text((d) => d.t)
            .attr('id', (d) => d.id!)
            .attr('cursor', 'pointer')
            .on('click', transcriptClicked)

        svg_legend.append('g').selectAll('x-axis')
            .data(axis_lines)
            .enter()
            .append('line')
            .attr('x1', (d) => d.x1 + textWidth)
            .attr('x2', (d) => d.x2 + textWidth)
            .attr('y1', (d) => d.y1)
            .attr('y2', (d) => d.y2)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 1)

        svg_legend.append('g').selectAll('x-axis-label')
            .data(axis_labels)
            .enter()
            .append('text')
            .attr('x', (d) => d.x + textWidth)
            .attr('y', (d) => d.y)
            .attr('font-size', '11')
            .attr('text-anchor', (d) => d.anchor!)
            .text((d) => d.t)
    }

    onDestroy(unsubscribe);
</script>

<style>
    #vis {
		width: 100%;
		max-height: 30vh;
		background-color: white;
        overflow-y: scroll;
	}
    
    #scale_legend {
		width: 100%;
		height: 55px;
		background-color: white;
        overflow-y: scroll;
        margin-bottom: 10px;
	}

    #tooltip {
        position: absolute;
        opacity: 0;
        background: rgba(255, 255, 255, .9);
    }

    #haplotype-table {
        margin-top: 1.5vh;
        margin-left: 2vw;
        max-height: 35vh;
        overflow: scroll;
        min-width: 50%;
        max-width: 100%;
    }

    :root {
      --sliderPrimary: #FF9800;
      --sliderSecondary: rgba(0, 0, 0, 0.05);
    }

</style>

<div id="vis" bind:this={vis}></div>
<div id="scale_legend" bind:this={legend_div}></div>
<!--
<div id="zoom-slider" on:drag|preventDefault={e => {}}>
    <span>Zoom level: {zoom_level}</span>
    <RangeSlider min={1} max={20} values={[1]} on:change={(evt) => {zoom_level = evt.detail.value}} />
</div>
-->
<div id="tooltip"></div>
<div class="mb-4">
    <SplicingVariationLegend variantTypes={VariantTypeData} />
</div>
<hr />
<div class="flex justify-between mt-2">
    <h5>Select haplotype:</h5>
    <div class="flex mr-5 items-center">
        <input type="checkbox" id="filter_haplotypes" name="filter_haplotypes" value="FilterHaplotypes" on:click={() => {filterHaplotypes = !filterHaplotypes}}>
        <label class="ml-2" for="filter_haplotypes"> Hide haplotypes with no matching variant peptide</label><br>
    </div>
</div>
<div id='haplotype-table'>
    <HaplotypeTable filterHaplotypes={filterHaplotypes} />
</div>
