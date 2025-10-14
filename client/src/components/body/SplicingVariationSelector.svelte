<script lang="ts">
    import * as d3 from 'd3';

    import HaplotypeTable from './HaplotypeTable.svelte';
    import SplicingVariationLegend from './SplicingVariationLegend.svelte';
    // import RangeSlider from "svelte-range-slider-pips";
    import { onDestroy, onMount } from 'svelte';
    import { activeTabIdx, proteoformSearchRequestPending, storeSelection1, selectedTranscriptIdx, selectedVariantIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedHaplotype, availableVariants, protRefSubrgaph, protHapSubrgaph, selectedTranscript as selectedTranscriptStore, peptideHighlightFixed } from "../../stores/stores.js"
    import { /*testAlignment, */alignExons, getScreenX, mapIntronCoordinates, alignPeptidesExons } from "../../tools/alignExons"
    import { mergeOverlappingRegions } from "../../tools/alignSequences"
    import type { Gene, Exon, Transcript, Variant, Haplotype } from '../../types/graph_nodes'
    import type { SplicingAlignmentRegion } from '../../types/alignment_types'
    import { SplicingRegionType } from '../../types/alignment_types'
    import { parseProteoformSubgraph } from "../../tools/parseGraphQueryResult"
    import type { D3CircleElem, D3LineElem, D3RectElem, D3TextElem } from '../../types/d3_elements'

    export let x_coord_system: string

    const receive_x_param = (node: HTMLDivElement, coords: string) => {
        updateXAxis()

        return {
            update(coords: string) {
              updateXAxis()
            }
        }
    }

    let filterHaplotypes = false

    let alignment: Array<SplicingAlignmentRegion> = [];
    let nrows: number = 1;
    let component_width: number = 10;
    let component_height: number = 10;
    let selectedGene: Gene;
    let selectedTranscript: Transcript;
    let availableHaplotypes: Array<Haplotype> = [];
        
    let exonData: Array<D3RectElem> = []
    let intronData: Array<D3LineElem> = []
    let labelData: Array<D3TextElem> = []
    let startStopData: Array<D3LineElem> = []
    let variantData: Array<D3LineElem> = []
    let variantMarks: Array<D3CircleElem> = []
    let axis_lines: Array<D3LineElem> = []
    let axis_ticks: Array<D3LineElem> = []
    let axis_labels: Array<D3TextElem> = []

    const VariantTypeData = [
        {'hex': '#C1A40D', 'name': 'SNP'},        
        {'hex': '#CB00BE', 'name': 'in-frame insertion / deletion'},
        {'hex': '#980000', 'name': 'frameshift'},
    ]
    
    const margin = {
        top: 30,
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
            //redraw()
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
        const div_node = (d3.select("#splicing-vis-main").node() as HTMLDivElement)
        if (div_node) {
            component_width = div_node.getBoundingClientRect().width - margin.left - margin.right;
            component_height = div_node.getBoundingClientRect().height - margin.top - margin.bottom;
        }

        redraw()
    }

    async function transcriptClicked(this: SVGTextElement, evt: any) {
        const transcriptIdx = parseInt(this.id.split('_')[1]) 

        selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), -1, ...$selectedVariantIdx.slice($activeTabIdx+1)])
        selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
        selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
        protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
        peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])

        if ($selectedTranscriptIdx[$activeTabIdx] !== transcriptIdx) {
            proteoformSearchRequestPending.set(true)
            selectedTranscriptIdx.set([...$selectedTranscriptIdx.slice(0, $activeTabIdx), transcriptIdx, ...$selectedTranscriptIdx.slice($activeTabIdx+1)])

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
                    const parsedData = parseProteoformSubgraph(data, $selectedTranscriptStore!.canonical_protein);
                    //console.log(parsedData)
                    protRefSubrgaph.set([...$protRefSubrgaph.slice(0, $activeTabIdx), [parsedData], ...$protRefSubrgaph.slice($activeTabIdx+1)])
                    proteoformSearchRequestPending.set(false)
                });
        } else {
            selectedTranscriptIdx.set([...$selectedTranscriptIdx.slice(0, $activeTabIdx), -1, ...$selectedTranscriptIdx.slice($activeTabIdx+1)])
            protRefSubrgaph.set([...$protRefSubrgaph.slice(0, $activeTabIdx), [], ...$protRefSubrgaph.slice($activeTabIdx+1)])
        }
    }

    function variantClicked(evt: MouseEvent) : void {
        const variantIdx = parseInt((evt.target! as SVGLineElement).id.split('_')[1])

        if ($selectedVariantIdx[$activeTabIdx] !== variantIdx) {
            selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), variantIdx, ...$selectedVariantIdx.slice($activeTabIdx+1)])
        } else {
            selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), -1, ...$selectedVariantIdx.slice($activeTabIdx+1)])
        }
        
        selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
        selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
        protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
    }

    function mouseOverVariant(evt: MouseEvent, v: D3LineElem): void {
        const tooltip_x = v.x1
        const tooltip_text = v.tooltiptext!
        d3.select("#variant-id-text").attr('x', tooltip_x).text(tooltip_text)

        const tooltip_width = (d3.select('#variant-id-text').node() as SVGGraphicsElement).getBBox().width
        d3.select("#variant-id-background").attr('x', tooltip_x - tooltip_width/2).attr('width', tooltip_width)
    }

    function mouseOverAxis(evt: MouseEvent): void {
        // see which part of the axis we're at
        const tick_idx = parseInt((evt.target as SVGRectElement).id.split('-')[2]) * 2

        // hide the original ticks if present
        d3.select('#axis-label-'+tick_idx).attr('fill', 'none')
        d3.select('#axis-label-'+(tick_idx+1)).attr('fill', 'none')

        // make the axis segment thicker
        d3.select("#axis-line-"+(tick_idx/2)).attr('class', 'stroke-2')

        // get the coords and values of the ticks
        const left_label = axis_labels[tick_idx]
        const left_tick = axis_ticks[tick_idx]
        const right_tick = axis_ticks[tick_idx+1]
        const right_label = axis_labels[tick_idx+1]

        /// check where to place the labels so that they don't overlap
        const axis_length = right_tick.x1 - left_tick.x1
        const left_label_end = left_tick.x1 + Math.min(axis_length/2-2, 30)
        const right_label_start = right_tick.x1 - Math.min(axis_length/2-2, 30)

        // add the new ticks to the SVG
        d3.select("#axis-highlight").append("line").attr('x1', left_tick.x1).attr('x2', left_tick.x2).attr('y1', left_tick.y1).attr('y2', left_tick.y2).attr('stroke-width', 2).attr('id', 'axis-tick-'+tick_idx).attr('stroke', left_tick.color_hex)
        d3.select("#axis-highlight").append("text").attr('x', left_label_end).attr('y', 5).attr('text-anchor', 'end').attr('id', 'highlight-axis-label-'+tick_idx).attr('font-size', 11).text(left_label.t).attr('font-weight', 'bold')

        d3.select("#axis-highlight").append("line").attr('x1', right_tick.x1).attr('x2', right_tick.x2).attr('y1', right_tick.y1).attr('y2', right_tick.y2).attr('stroke-width', 2).attr('id', 'axis-tick-'+(tick_idx+1)).attr('stroke', right_tick.color_hex)
        d3.select("#axis-highlight").append("text").attr('x', right_label_start).attr('y', 5).attr('text-anchor', 'start').attr('id', 'highlight-axis-label-'+(tick_idx+1)).attr('font-size', 11).text(right_label.t).attr('font-weight', 'bold')

        // get the bounding box of the ticks
        const left_label_bbox = (d3.select('#highlight-axis-label-'+tick_idx).node() as SVGGraphicsElement).getBBox()
        const right_label_bbox = (d3.select('#highlight-axis-label-'+(tick_idx+1)).node() as SVGGraphicsElement).getBBox()
        const bg_width = right_label_bbox.x + right_label_bbox.width - left_label_bbox.x

        // move and resize the background rectangle to obscure any overlapping text
        d3.select("#axis-label-bg-1").attr('x', left_label_bbox.x-5).attr('y', left_label_bbox.y).attr('width', bg_width+10).attr('height', left_label_bbox.height)
    }

    function mouseOutAxis(evt: MouseEvent): void {
        const tick_idx = parseInt((evt.target as SVGRectElement).id.split('-')[2]) * 2
        
        d3.select("#axis-highlight").selectChildren("text").remove()
        d3.select("#axis-highlight").selectChildren("line").remove()
        d3.select("#axis-label-bg-1").attr('x', -50).attr('y', 0).attr('width', 0).attr('height', 0)
        d3.select("#axis-label-bg-2").attr('x', -50).attr('y', 0).attr('width', 0).attr('height', 0)
        
        // make the axis segment thinner
        d3.select("#axis-line-"+(tick_idx/2)).attr('class', 'stroke-1')
        
        d3.select('#axis-label-'+tick_idx).attr('fill', '#000000')
        d3.select('#axis-label-'+(tick_idx+1)).attr('fill', '#000000')
    }

    function drawAxis(axis_coordinates: number[], skipped_segments: SplicingAlignmentRegion[], strand_factor: number, text_width: number, start_coord: number, end_coord: number, main_label_text: string, show_end_tick: boolean = false, min_label_distance: number = 60): void {
        // clear current axis elements
        axis_lines = []
        axis_ticks = []
        axis_labels = []
        let axis_bp_from = start_coord

        // alternate labels on top and bottom, but do not draw labels if segment too short
        let last_label_top = -1, last_label_bottom = -1
        const alternate_by = show_end_tick ? 2 : 4

        for (let i=0; i < axis_coordinates.length; i += 2) {
            
            const bp_from = axis_bp_from
            const bp_to = (Math.floor(i/2) < skipped_segments.length) ? skipped_segments[Math.floor(i/2)].from : end_coord

            const last_label_x = (i % alternate_by) === 0 ? last_label_bottom : last_label_top
            let label_distance = last_label_x >= 0 ? axis_coordinates[i] - last_label_x : 999999

            axis_lines.push({
                x1: axis_coordinates[i],
                x2: axis_coordinates[i+1],
                y1: 10,
                y2: 10,
                color_hex: "#000000"
            })

            axis_ticks.push({
                x1: axis_coordinates[i],
                x2: axis_coordinates[i],
                y1: 7,
                y2: 13,
                color_hex: "#000000",
                active: label_distance > min_label_distance
            })

            axis_labels.push({
                x: axis_coordinates[i],
                y: (i % alternate_by) === 0 ? 25 : 5,          // alternating labels on top / bottom
                t: (strand_factor * bp_from).toLocaleString(),
                highlight: label_distance > min_label_distance,
                anchor: "middle"
            })

            if (label_distance > min_label_distance) {
                if ((i % alternate_by) === 0) {
                    last_label_bottom = axis_coordinates[i]
                } else {
                    last_label_top = axis_coordinates[i]
                }
            }

            if (i === axis_coordinates.length - 2) {
                // for the last segment, show the end coordinate as well
                label_distance = axis_coordinates[i+1] - ((i % alternate_by) === 0 ? last_label_top : last_label_bottom)

                axis_labels.push({
                    x: axis_coordinates[i+1],
                    y: (i % alternate_by) === 0 ? 5 : 25,          // alternating labels on top / bottom
                    t: (strand_factor * end_coord).toLocaleString(),
                    highlight: label_distance > min_label_distance,
                    anchor: "end"
                })

                axis_ticks.push({
                    x1: axis_coordinates[i+1],
                    x2: axis_coordinates[i+1],
                    y1: 7,
                    y2: 13,
                    color_hex: "#000000",
                    active: label_distance > min_label_distance
                })
            } else {
                // for other segments, hide the end coodrinate, but show on mouseover, unless specified to show
                if (show_end_tick) {
                    label_distance = axis_coordinates[i+1] - ((i % alternate_by) === 0 ? last_label_bottom : last_label_top)
                }

                axis_labels.push({
                    x: axis_coordinates[i+1],
                    y: ((i+1) % alternate_by) === 0 ? 25 : 5,          // alternating labels on top / bottom
                    t: (strand_factor * bp_to).toLocaleString(),
                    highlight: show_end_tick && (label_distance > min_label_distance),
                    anchor: "middle"
                })

                axis_ticks.push({
                    x1: axis_coordinates[i+1],
                    x2: axis_coordinates[i+1],
                    y1: 7,
                    y2: 13,
                    color_hex: "#000000",
                    active: show_end_tick && (label_distance > min_label_distance)
                })

                if (show_end_tick && (label_distance > min_label_distance)) {
                if (((i+1) % alternate_by) === 0) {
                    last_label_bottom = axis_coordinates[i]
                } else {
                    last_label_top = axis_coordinates[i]
                }
            }
            }

            axis_bp_from = (Math.floor(i/2) < skipped_segments.length) ? skipped_segments[Math.floor(i/2)].to - 1 : -1
        }
        
        axis_labels.push({
            x: -text_width + 15,
            y: 15,          
            t: main_label_text,
            highlight: true,
            anchor: "left"
        })
    }

    function updateXAxis() {
        const textWidth = Math.max(150, Math.round(component_width / 10))
        const strand_factor = selectedGene.strand === '+' ? 1 : -1
        
        if (selectedTranscript && (x_coord_system === 'Transcript')) {
            let axis_coordinates: number[] = []
            let introns: SplicingAlignmentRegion[] = []
            let current_length = 0

            selectedTranscript.exons.forEach((exon: Exon, i: number) => {
                axis_coordinates.push(getScreenX((selectedGene.strand === '+') ? exon.bp_from : -exon.bp_to, alignment, component_width - textWidth))
                axis_coordinates.push(getScreenX((selectedGene.strand === '+') ? exon.bp_to : -exon.bp_from, alignment, component_width - textWidth))

                current_length += (exon.bp_to - exon.bp_from)

                introns.push({
                    region_type: SplicingRegionType.Intron_skip,
                    from: current_length,
                    to: current_length
                })
            })

            drawAxis(axis_coordinates, introns, 1, textWidth, 0, current_length, 'Transcript', true, 30)

        } else if (selectedTranscript && (x_coord_system === 'Protein')) { 
            let axis_coordinates: number[] = []
            let introns: SplicingAlignmentRegion[] = []
            let current_length = 0
            const start_bp = selectedTranscript.start.length > 0 ? selectedTranscript.start[0] : selectedTranscript.exons[0].bp_from
            const stop_bp = selectedTranscript.stop.length > 0 ? selectedTranscript.stop[0] : selectedTranscript.exons[selectedTranscript.exons.length-1].bp_to

            selectedTranscript.exons.forEach((exon: Exon, i: number) => {
                const local_bp_from = (selectedGene.strand === '+') ? Math.max(exon.bp_from, start_bp) : -Math.min(exon.bp_to, start_bp)
                const local_bp_to = (selectedGene.strand === '+') ? Math.min(exon.bp_to, stop_bp) : -Math.max(exon.bp_from, stop_bp)

                const x1 = getScreenX(local_bp_from, alignment, component_width - textWidth)
                const x2 = getScreenX(local_bp_to, alignment, component_width - textWidth)

                if ((x2 - x1) < 2) {
                    return
                }

                axis_coordinates.push(x1)
                axis_coordinates.push(x2)

                current_length += Math.floor((local_bp_to - local_bp_from) / 3)

                introns.push({
                    region_type: SplicingRegionType.Intron_skip,
                    from: current_length,
                    to: current_length
                })
            })

            drawAxis(axis_coordinates, introns, 1, textWidth, 0, current_length, 'Protein', true, 25)

        } else {
            const axis_coordinates = mapIntronCoordinates(alignment[0].from, alignment[alignment.length - 1].to, alignment, component_width - textWidth)
            const skipped_segments = alignment.filter(segment => segment.region_type === SplicingRegionType.Intron_skip)
            
            drawAxis(axis_coordinates, skipped_segments, strand_factor, textWidth, alignment[0].from, alignment[alignment.length - 1].to, "Chromosome " + selectedGene.chrom)
        }
    }

    /**
     * DRAW THE COMPONENT
     */

    function redraw(): void {
        // Keep the row height within boundaries to avoid overplotting -> rescale the SVG accordingly at the end
        const rowHeight = Math.max(Math.min(Math.floor(component_height / nrows), max_row_height), min_row_height)
        const rowMargin = Math.floor(rowHeight / 5)
        const textWidth = Math.max(150, Math.round(component_width / 10))
        const strand_factor = selectedGene.strand === '+' ? 1 : -1

        // compute the coordinates for all exons and introns
        exonData = []
        intronData = []
        labelData = []
        startStopData = []
        variantData = []
        variantMarks = []

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
            } 
            
            if (variant.found) {
                variantMarks.push({
                    x: xPos,
                    y: 18,
                    r: 3,
                    color_hex: "#15803D"
                })
            }
        })

        // draw the axis
        updateXAxis()
    }

    onDestroy(unsubscribe);
</script>

<style>
    .vis {
		width: 100%;
		background-color: white;
	}

    #splicing-vis-main {
        max-height: 30vh;
        overflow-y: scroll;
    }
    
    #scale_legend {
		width: 100%;
		height: 55px;
		background-color: white;
        overflow-y: scroll;
        margin-bottom: 10px;
	}

    #haplotype-table {
        margin-top: 1.5vh;
        margin-left: 2vw;
        max-height: 35vh;
        overflow: scroll;
        min-width: 50%;
        max-width: 100%;
    }
</style>

{#if !selectedGene}
    <span>No gene selected.</span>
{:else if selectedGene.transcripts.length === 0}
    <span>Selected gene has no available splicing.</span>
{:else}
    <div id="splicing-vis-top" class="vis">
        <svg width={component_width} height={margin.top}>
            <g transform={"translate(" + margin.left + ",0)"}>
                <text x={0}, y={20} font-weight='bold' text-anchor='start'>Transcript ID</text>
            </g>
            <g id="plot-top" transform={"translate(" + (margin.left + Math.max(150, Math.round(component_width / 10))) + ",0)"}>            
                <g id="variant-marks">
                    {#each variantMarks as mark}
                        <circle cx={mark.x} cy={mark.y} stroke="none" r={mark.r} fill={mark.color_hex}></circle>
                    {/each}
                </g>
                <rect id="variant-id-background" x=0 y=5 width=1 height=15 stroke="none" fill="#FFFFFF"></rect>
                <text id="variant-id-text" x=0 y=20 text-anchor="middle"></text>
            </g>
        </svg>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div id="splicing-vis-main" class="vis" use:receive_x_param={x_coord_system}>
        <svg width={component_width} height={nrows * Math.max(Math.min(Math.floor(component_height / nrows), max_row_height), min_row_height)}>
            <g id="main-plot" transform={"translate(" + (margin.left +Math.max(150, Math.round(component_width / 10))) + ',0)'}>
                <g id="introns-group">
                    {#each intronData as intron}
                        <line x1={intron.x1} x2={intron.x2} y1={intron.y1} y2={intron.y2} stroke={intron.color_hex} stroke-width=1.33></line>
                    {/each}
                </g>
                <g id="exons-group">
                    {#each exonData as exon}
                        <rect x={exon.x} y={exon.y} width={exon.width} height={exon.height} stroke="none" fill={exon.color_hex}></rect>
                    {/each}
                </g>
                <g id="variant-lines">
                    {#each variantData as variant}
                        <line 
                            id={variant.id + '_' + variant.tooltiptext}
                            class={"stroke-2" + ((variant.active && ($selectedTranscriptIdx[$activeTabIdx] > -1) && !$proteoformSearchRequestPending) ? " cursor-pointer" : ($proteoformSearchRequestPending ? " cursor-wait" : ""))}
                            x1={variant.x1} 
                            x2={variant.x2} 
                            y1={variant.y1} 
                            y2={variant.y2} 
                            stroke={variant.color_hex}
                            stroke-opacity={variant.active ? "100%" : "30%"}
                            on:click={(variant.active && ($selectedTranscriptIdx[$activeTabIdx] > -1) && !$proteoformSearchRequestPending) ? variantClicked : () => {}}
                            on:mouseover={(evt) => mouseOverVariant(evt, variant)}
                            on:mouseleave={() => {
                                d3.select("#variant-id-text").attr('x', 0).text("")
                                d3.select("#variant-id-background").attr('x', 0).attr('width',1)
                            }}
                        ></line>
                    {/each}
                </g>
                <g id="start-stop-lines">
                    {#each startStopData as s_s_line}
                        <line x1={s_s_line.x1} x2={s_s_line.x2} y1={s_s_line.y1} y2={s_s_line.y2} stroke={s_s_line.color_hex} stroke-width=2></line>
                    {/each}
                </g>
            </g>
            <g id="transcript-labels" transform={"translate(" + margin.left + ",0)"}>
                {#each labelData as transcript_label}
                    <text 
                        x={transcript_label.x} 
                        y={transcript_label.y} 
                        font-weight={transcript_label.highlight ? "bold" : "normal"} 
                        id={transcript_label.id} 
                        class={$proteoformSearchRequestPending ? "cursor-wait" : "cursor-pointer"}
                        on:click={$proteoformSearchRequestPending ? () => {} : transcriptClicked}
                    >
                        {transcript_label.t}
                    </text>
                {/each}
            </g>
        </svg>
    </div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div id="splicing-vis-axis" class="vis">
        <svg width={component_width + margin.left + margin.right} height=50>
            <g transform={"translate(" + (margin.left + Math.max(150, Math.round(component_width / 10))) + ",15)"}>
                <g id="axis-lines">
                    {#each axis_lines as l, idx}
                        <rect x={l.x1} y={-15} width={l.x2-l.x1} height=50 fill="#FFFFFF" id={"axis-mousearea-"+idx} 
                            on:mouseover={mouseOverAxis}
                            on:mouseleave={mouseOutAxis}
                        ></rect>
                        <line x1={l.x1} x2={l.x2} y1={l.y1} y2={l.y2} stroke={l.color_hex} class={"stroke-1"} id={"axis-line-"+idx}></line>       
                    {/each}
                </g>
                <g id="axis-ticks">
                    {#each axis_ticks as l, idx}
                        {#if l.active}
                            <line x1={l.x1} x2={l.x2} y1={l.y1} y2={l.y2} stroke={l.color_hex} class={"stroke-1"}></line>                    
                        {/if}
                    {/each}
                </g>
                <g id="axis-labels">
                    {#each axis_labels as lb, idx}
                        {#if lb.highlight}
                            <text x={lb.x} y={lb.y} text-anchor={lb.anchor} font-size=11 id={'axis-label-'+idx}>{lb.t}</text>
                        {/if}
                    {/each}
                </g>
                <g id="axis-highlight">
                    <rect id="axis-label-bg-1" x={-50} y=0 width=0 height=0 fill="#FFFFFF"></rect>
                    <rect id="axis-label-bg-2" x={-50} y=0 width=0 height=0 fill="#FFFFFF"></rect>
                </g>
            </g>
        </svg>
    </div>
    <!--
    <div id="zoom-slider" on:drag|preventDefault={e => {}}>
        <span>Zoom level: {zoom_level}</span>
        <RangeSlider min={1} max={20} values={[1]} on:change={(evt) => {zoom_level = evt.detail.value}} />
    </div>
    -->
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
{/if}