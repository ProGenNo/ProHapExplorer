<script lang="ts">
    import * as d3 from 'd3';
    import { onMount, onDestroy } from 'svelte';
    import { selectedProteoform, selectedTranscript } from "../../stores/stores"
    import { alignSequences } from '../../tools/alignSequences'
    import { ProteinRegionType } from '../../types/alignment_types'
    import type { Alignment } from '../../types/alignment_types'
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

    let alignmentData: Alignment | null;

    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 30
    };

    const unsubscribe = selectedProteoform.subscribe((proteoform: Proteoform | undefined) => {
        if (!proteoform) {
            alignmentData = null
            return
        }

        alignmentData = alignSequences(
            $selectedTranscript!.canonical_protein.sequence, 
            proteoform.sequence, 
            $selectedTranscript!.cDNA_sequence, 
            proteoform.cDNA_changes, 
            proteoform.protein_changes, 
            proteoform.reading_frame, 
            proteoform.start_aa )

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

    function redraw(): void {
		// empty vis div
		d3.select(vis).html(null); 

        if ((!alignmentData) || !$selectedTranscript) {
            return
        }

        const rowHeight = Math.floor(height / nrows)
        const rowMargin = Math.floor(rowHeight / 5)

        const UTR_screen_length = 60
        const nucleotide_rect_width = 4
        
        let x_pos = UTR_screen_length + 10
        let nucleotide_rects: Array<D3RectElem> = []
        let aa_letters_ref: Array<D3TextElem> = []
        let aa_letters_alt: Array<D3TextElem> = []
        let UTR_rects: Array<D3RectElem> = []
        let UTR_text: Array<D3TextElem> = []

        // Abbreviate the 5' UTR
        
        UTR_rects.push({
            x: 0,
            y: 0,
            width: UTR_screen_length,
            height: nrows * rowHeight,
            color_hex: "#c0c0c0"
        })

        UTR_text.push({
            t: '5\' UTR',
            x: UTR_screen_length * 0.1,
            y: (nrows / 2) * rowHeight + rowMargin / 2,
            highlight: false
        })

        const UTR_abbrev_bp = alignmentData.segments[0].bp_to
        const aligned_protein_start = Math.floor(UTR_abbrev_bp / 3)
        
        const maxWidth = UTR_screen_length + 10 + nucleotide_rect_width * (alignmentData.alt_cDNA.length - UTR_abbrev_bp)

        // Prepare the cDNA and protein sequences
        let drawRefProtein = true, drawAltProtein = true
        let ref_bp_pad = 0, alt_bp_pad = 0
        let next_highlight_region = 1
        let is_highlighted = false

        for (let bp = UTR_abbrev_bp; bp < alignmentData.alt_cDNA.length; bp++) {
            const ref_nucl = alignmentData.ref_cDNA[bp]
            nucleotide_rects.push({
                x: x_pos + (bp - UTR_abbrev_bp) * nucleotide_rect_width,
                y: rowHeight,
                width: nucleotide_rect_width,
                height: rowHeight - rowMargin,
                color_hex: NucleotideColor[ref_nucl]
            })

            const alt_nucl = alignmentData.alt_cDNA[bp]
            nucleotide_rects.push({
                x: x_pos + (bp - UTR_abbrev_bp) * nucleotide_rect_width,
                y: 2 * rowHeight,
                width: nucleotide_rect_width,
                height: rowHeight - rowMargin,
                color_hex: NucleotideColor[alt_nucl]
            })

            if ((alignmentData.segments[next_highlight_region].type === ProteinRegionType.mORF) && (alignmentData.segments[next_highlight_region].bp_from <= bp) && (alignmentData.segments[next_highlight_region].bp_to > bp)){
                is_highlighted = true
            } else if ((alignmentData.segments[next_highlight_region].type === ProteinRegionType.mORF) && (alignmentData.segments[next_highlight_region].bp_to == bp)) {
                next_highlight_region++
                is_highlighted = false
            }

            // check if we aren't in a padded region (inside an insertion in the other allele)
            // if so, remember the length of the padding and continue drawing the protein sequence after the region
            if (ref_nucl === 'x') {
                ref_bp_pad++
            } else if (((bp - UTR_abbrev_bp - ref_bp_pad) % 3) === 0) {
                const aa_pos = Math.floor((bp - ref_bp_pad) / 3) - aligned_protein_start

                if ((aa_pos - aligned_protein_start) < alignmentData.ref_protein.length) {
                    aa_letters_ref.push({
                        t: alignmentData.ref_protein[aa_pos],
                        highlight: is_highlighted,
                        x: x_pos + nucleotide_rect_width + (bp - UTR_abbrev_bp + ref_bp_pad + 1) * nucleotide_rect_width,
                        y: Math.floor(rowHeight / 2 + rowMargin / 2),
                        anchor: "middle"
                    })
                }
            }

            // check if we aren't in a deleted region
            // if so, remember the length and continue drawing the protein after the rehion
            if (alt_nucl === 'x') {
                alt_bp_pad++
            } else if (((bp - UTR_abbrev_bp - alt_bp_pad) % 3) === 0) {
                const aa_pos = Math.floor((bp - alt_bp_pad) / 3)

                if (aa_pos < alignmentData.alt_protein.length) {
                    aa_letters_alt.push({
                        t: alignmentData.alt_protein[aa_pos],
                        highlight: is_highlighted,
                        x: x_pos + nucleotide_rect_width + (bp - UTR_abbrev_bp + ref_bp_pad + 1) * nucleotide_rect_width,
                        y: Math.floor(3.5 * rowHeight + rowMargin / 2),
                        anchor: "middle"
                    })
                }
            }
        }

        // Draw everything into the SVG

        const svg = d3.select(vis)
			.append('svg')
			.attr('width', maxWidth + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			//.attr('transform', `translate(${[margin.left, margin.top]})`)

        svg.append('g').selectAll('utr_rect')
			.data(UTR_rects)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)

        svg.append('g').selectAll('UTR_label')
            .data(UTR_text)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y + margin.top)
            .attr('font-weight', "normal")
            .text((d) => d.t)

        svg.append('g').selectAll('nucl_rect')
			.data(nucleotide_rects)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)

        svg.append('g').selectAll('aa_letter')
            .data(aa_letters_ref)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y + margin.top)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .attr('fill', (d) => d.highlight ? "red" : "black")
            .attr('text-anchor', (d) => d.anchor!)
            .text((d) => d.t)

        svg.append('g').selectAll('aa_letter')
            .data(aa_letters_alt)
            .enter()
            .append('text')
            .attr('x', (d) => d.x)
            .attr('y', (d) => d.y + margin.top)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .attr('fill', (d) => d.highlight ? "red" : "black")
            .attr('text-anchor', (d) => d.anchor!)
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