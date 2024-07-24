<script lang="ts">
    import * as d3 from 'd3';
    import { onMount, onDestroy } from 'svelte';
    import { selectedProteoform, selectedTranscript } from "../../stores/stores"
    import { alignSequences } from '../../tools/alignSequences'
    import { ProteinRegionType } from '../../types/alignment_types'
    import type { AlignedSequenceSegment } from '../../types/alignment_types'
    import type { Proteoform } from '../../types/graph_nodes'
    import type { D3LineElem, D3RectElem, D3TextElem } from '../../types/d3_elements'

    const NucleotideColor = {
        A: "#00aa00", 
        C: "#0000dc", 
        T: "#c80000", 
        G: "#dcdc00",
        x: "#aaaaaa"
    }

    let vis: HTMLDivElement; // binding with div for visualization
    let vis_label: HTMLDivElement;
    let width = 10
    let height = 10
    const nrows = 4

    let alignmentData: Array<AlignedSequenceSegment> = []

    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 30
    };
    
    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    const unsubscribe = selectedProteoform.subscribe((proteoform: Proteoform | undefined) => {
        if (!proteoform) {
            alignmentData = []
        } else {
            alignmentData = alignSequences(
                $selectedTranscript!.canonical_protein.sequence, 
                proteoform.sequence, 
                $selectedTranscript!.cDNA_sequence, 
                proteoform.cDNA_changes, 
                proteoform.protein_changes, 
                proteoform.reading_frame, 
                proteoform.start_aa ).segments
        }

        redraw()
    })

    function windowResized(): void {
		// determine width & height of parent element and subtract the margin
		width = d3.select(vis).node()!.getBoundingClientRect().width - margin.left - margin.right;
		height = d3.select(vis).node()!.getBoundingClientRect().height - margin.top - margin.bottom;

        drawAxisLabel()
        redraw()
    }

    function drawAxisLabel(): void {
		const label_width = d3.select(vis_label).node()!.getBoundingClientRect().width;
		const label_height = d3.select(vis_label).node()!.getBoundingClientRect().height - margin.top - margin.bottom;
        
        const rowHeight = Math.floor(label_height / nrows)
        const rowMargin = Math.floor(rowHeight / 5)

        d3.select(vis_label).html(null);        
        
        const axis_labels: Array<D3TextElem> = [
            {
                t: 'Ref. protein',
                x: 10,
                y: Math.floor(rowHeight / 2 + rowMargin / 2),
                highlight: false
            },
            {
                t: 'Ref. cDNA',
                x: 10,
                y: Math.floor(1.5 * rowHeight + rowMargin / 2),
                highlight: false
            }, 
            {
                t: 'Alt. cDNA',
                x: 10,
                y: Math.floor(2.5 * rowHeight + rowMargin / 2),
                highlight: false
            },
            {
                t: 'Alt. protein',
                x: 10,
                y: Math.floor(3.5 * rowHeight + rowMargin / 2),
                highlight: false
            }
        ]

        const svg = d3.select(vis_label)
			.append('svg')
			.attr('width', label_width)
			.attr('height', label_height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${[margin.left, margin.top]})`)

        svg.append('g').selectAll('Axis_label')
            .data(axis_labels)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', "normal")
            .text((d) => d.t)
    }

    // Called at every data change event
    function redraw(): void {
		// empty vis div
		d3.select(vis).html(null); 

        if ((alignmentData.length === 0) || !$selectedTranscript) {
            return
        }

        const rowHeight = Math.floor(height / nrows)
        const rowMargin = Math.floor(rowHeight / 5)

        const UTR_screen_length = 40
        const abbreviated_screen_length = 30
        const nucleotide_rect_width = 10

        let x_pos = UTR_screen_length + abbreviated_screen_length
        let nucleotide_rects: Array<D3RectElem> = []
        let aa_letters: Array<D3TextElem> = []
        let UTR_rects: Array<D3RectElem> = []
        let UTR_text: Array<D3TextElem> = []
        let abbreviations: Array<D3TextElem> = []

        alignmentData.forEach((segment, idx) => {
            if (segment.type === ProteinRegionType.mORF) {
                // abbreviated regionm before                 
                aa_letters.push({
                    t: '...',
                    x: x_pos - abbreviated_screen_length * 0.66,
                    y: (nrows / 2) * rowHeight + rowMargin / 2,
                    highlight: false
                })

                // ALT protien allele
                for (let ch = 0; ch < segment.alt_protein.length; ch++) {
                    aa_letters.push({
                        t: segment.alt_protein[ch],
                        highlight: false,
                        x: x_pos + nucleotide_rect_width + ch * 3 * nucleotide_rect_width,
                        y: Math.floor(3.5 * rowHeight + rowMargin / 2)
                    })
                }

                // REF protein allele
                for (let ch = 0; ch < segment.ref_protein.length; ch++) {
                    aa_letters.push({
                        t: segment.ref_protein[ch],
                        highlight: false,
                        x: x_pos + nucleotide_rect_width + ch * 3 * nucleotide_rect_width,
                        y: Math.floor(rowHeight / 2 + rowMargin / 2)
                    })
                }

                // both cDNA alleles
                for (let ch = 0; ch < segment.ref_cDNA.length; ch++) {
                    nucleotide_rects.push({
                        x: x_pos + ch * nucleotide_rect_width,
                        y: rowHeight,
                        width: nucleotide_rect_width,
                        height: rowHeight - rowMargin,
                        color_hex: NucleotideColor[segment.ref_cDNA[ch]]
                    })
                    nucleotide_rects.push({
                        x: x_pos + ch * nucleotide_rect_width,
                        y: 2 * rowHeight,
                        width: nucleotide_rect_width,
                        height: rowHeight - rowMargin,
                        color_hex: NucleotideColor[segment.alt_cDNA[ch]]
                    })
                }

                x_pos += Math.max(segment.ref_cDNA.length, segment.alt_cDNA.length) * nucleotide_rect_width + abbreviated_screen_length

            // Add UTRs and abbreviations
            } else if (segment.type === ProteinRegionType.UTR_5) {
                UTR_rects.push({
                    x: 0,
                    y: 0,
                    width: UTR_screen_length,
                    height: nrows * rowHeight,
                    color_hex: "#c0c0c0"
                })

                UTR_text.push({
                    t: 'UTR',
                    x: UTR_screen_length * 0.1,
                    y: (nrows / 2) * rowHeight + rowMargin / 2,
                    highlight: false
                })


            } else if (segment.type === ProteinRegionType.UTR_3) {
                UTR_rects.push({
                    x: x_pos,
                    y: 0,
                    width: UTR_screen_length,
                    height: nrows * rowHeight,
                    color_hex: "#c0c0c0"
                })

                UTR_text.push({
                    t: 'UTR',
                    x: x_pos + UTR_screen_length * 0.1,
                    y: (nrows / 2) * rowHeight + rowMargin,
                    highlight: false
                })
                
                abbreviations.push({
                    t: '...',
                    x: x_pos - abbreviated_screen_length * 0.66,
                    y: (nrows / 2) * rowHeight + rowMargin / 2,
                    highlight: false
                })
            }
        })

        const svg = d3.select(vis)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${[margin.left, margin.top]})`)
    
        svg.append('g').selectAll('utr_rect')
			.data(UTR_rects)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)

        svg.append('g').selectAll('UTR_label')
            .data(UTR_text)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', "normal")
            .text((d) => d.t)

        svg.append('g').selectAll('nucl_rect')
			.data(nucleotide_rects)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)

        svg.append('g').selectAll('aa_letter')
            .data(aa_letters)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .text((d) => d.t)

        svg.append('g').selectAll('abbreviation')
            .data(abbreviations)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y)
            .attr('font-weight', "normal")
            .text((d) => d.t)
    }

    onDestroy(unsubscribe)
</script>

<style>
    .nobr {
        float: left;
    }
    #vis {
		width: 90%;
		height: 15vh;
		background-color: white;
        overflow-x: scroll;
	}
    #axis-title {
        width: 10%;
        height: 15vh;
        background-color: white;
        overflow: hidden;
    }
</style>

<div>
    <div id="axis-title" class="nobr" bind:this={vis_label}></div>
    <div id="vis" bind:this={vis}></div>
</div>