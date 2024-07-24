<script lang="ts">
    import * as d3 from 'd3';
    import { onMount, onDestroy } from 'svelte';
    import { filteredPeptides, selectedTranscript, selectedHaplotype, selectedProteoform, selectedGene } from '../stores/stores'
    import { alignPSMs } from '../tools/alignSequences'
    import { getScreenX_simple } from '../tools/alignExons'
    import type { Proteoform, Exon, Transcript } from '../types/graph_nodes'
    import type { PSMAlignment } from '../types/alignment_types'
    import type { D3LineElem, D3RectElem, D3TextElem, D3CircleElem } from '../types/d3_elements'

    let vis: HTMLDivElement; // binding with div for visualization
    let vis_label: HTMLDivElement;
    let width = 10
    let height = 10
    const nrows = 7
    const bar_height_proportion = 0.35

    let alignmentData: Array<PSMAlignment | null> = [null, null]   // two alignment objects - 0: reference protein, 1: alternative protein

    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
    };

    const unsubscribe = filteredPeptides.subscribe(data => {
        alignmentData[0] = data.ref.length === 0 ? null : alignPSMs(data.ref)
        alignmentData[1] = data.alt.length === 0 ? null : alignPSMs(data.alt)

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

        const bar_row_height = Math.floor(height * bar_height_proportion)
        const line_row_height = Math.floor((height - 2 * bar_row_height) / (nrows - 2))
        const row_margin = Math.floor(line_row_height / 4)

        d3.select(vis_label).html(null);        
        
        const axis_labels: Array<D3TextElem> = [
            {
                t: '# ref. PSMs',
                x: 10,
                y: Math.floor(bar_row_height / 2 + row_margin / 2),
                highlight: false
            },
            {
                t: 'ref. protein',
                x: 10,
                y: Math.floor(bar_row_height + 0.15 * line_row_height + row_margin / 2),
                highlight: false
            }, 
            {
                t: 'exons',
                x: 10,
                y: Math.floor(bar_row_height + 2.5 * line_row_height + row_margin / 2),
                highlight: false
            },
            {
                t: 'alt. protein',
                x: 10,
                y: Math.floor(bar_row_height + 5.15 * line_row_height + row_margin / 2),
                highlight: false
            },
            {
                t: '# alt. PSMs',
                x: 10,
                y: Math.floor(1.5 * bar_row_height + 5.25 * line_row_height + row_margin / 2),
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

    function drawExons(exon_list: Array<Exon>, cDNA_length: number, line_row_height: number, bar_row_height: number, row_margin: number): Array<Array<any>> {
        let exon_elements: Array<D3RectElem> = []
        let splice_site_elements: Array<D3CircleElem> = []
        let splice_site_elements_alt: Array<D3CircleElem> = []

        // align exon rectangles and splice sites 
        exon_list.forEach((exon, exon_idx) => {
            const exon_screen_from = getScreenX_simple(exon_list, exon.bp_from, cDNA_length, width, $selectedGene!.strand === '+')
            const exon_screen_to = getScreenX_simple(exon_list, exon.bp_to, cDNA_length, width, $selectedGene!.strand === '+')

            const screen_x = Math.min(exon_screen_from, exon_screen_to)
            const screen_length = Math.abs(exon_screen_to - exon_screen_from) + 1

            exon_elements.push({
                width: screen_length,
                height: line_row_height - row_margin,
                x: screen_x,
                y: bar_row_height + 2 * line_row_height  + Math.floor(row_margin / 2),
                color_hex: "#e0e0e0"
            })

            if (exon_idx > 0) {                
                splice_site_elements.push({
                    x: screen_x,
                    y: bar_row_height + 0.5 * line_row_height + Math.floor(row_margin / 4),
                    r: line_row_height * 0.15,
                    color_hex: "#0099ff"
                })   

                splice_site_elements_alt.push({
                    x: screen_x,
                    y: bar_row_height + 4.5 * line_row_height + Math.floor(row_margin / 4),
                    r: line_row_height * 0.15,
                    color_hex: "#0099ff"
                })
            }
        })
        
        return [exon_elements, splice_site_elements, splice_site_elements_alt]
    }

    function drawPSMBars(alignedPSMs: PSMAlignment, max_PSM_count: number, max_protein_length: number, start_codon_x: number, y_start: number, flip_scale: boolean, bar_row_height: number): Array<D3RectElem> {
        let PSM_bars: Array<D3RectElem> = []

        const screen_PSMcount_factor = bar_row_height / max_PSM_count
        const screen_protein_factor = width / max_protein_length

        let x_position = start_codon_x + Math.floor(alignedPSMs.aa_pos[0] * screen_protein_factor)
        let y_value_spec = Math.floor(alignedPSMs.PSM_count_specific[0] * screen_PSMcount_factor)
        let y_value_unspec = Math.floor(alignedPSMs.PSM_count_unspecific[0] * screen_PSMcount_factor)

        for (let i=1; i < alignedPSMs.aa_pos.length; i++) {
            let next_x_value = start_codon_x + Math.floor(alignedPSMs.aa_pos[i] * screen_protein_factor)

            if (y_value_spec > 0) {
                PSM_bars.push({
                    x: x_position,
                    y: flip_scale ? y_start : y_start - y_value_spec,
                    width: next_x_value - x_position,
                    height: y_value_spec,
                    color_hex: "#73B2E3"
                })
            }

            if (y_value_unspec > 0) {
                PSM_bars.push({
                    x: x_position,
                    y: flip_scale ? y_start - y_value_spec: y_start - y_value_spec - y_value_unspec,
                    width: next_x_value - x_position,
                    height: y_value_unspec,
                    color_hex: "#EECC1C"
                })
            }

            x_position = next_x_value
            y_value_spec = Math.floor(alignedPSMs.PSM_count_specific[i] * screen_PSMcount_factor)
            y_value_unspec = Math.floor(alignedPSMs.PSM_count_unspecific[i] * screen_PSMcount_factor)
        }

        return PSM_bars
    }

    function drawAlleles(cDNA_length: number, line_row_height: number, bar_row_height: number, row_margin: number): Array<Array<any>> {
        let ref_snp_loc: Array<D3CircleElem> = []
        let ref_indel_loc: Array<D3RectElem> = []
        let ref_alleles: Array<D3TextElem> = []
        let alt_snp_loc: Array<D3CircleElem> = []
        let alt_indel_loc: Array<D3RectElem> = []
        let alt_alleles: Array<D3TextElem> = []
        let frameshift_loc: Array<D3RectElem> = []

        const cDNA_scale = d3.scaleLinear().domain([0, cDNA_length]).range([0, width])

        const protein_changes = $selectedProteoform!.protein_changes.split(';')

        $selectedProteoform!.cDNA_changes.split(';').forEach((change: string, changeIdx: number) => {            
            const loc = parseInt(change.split(':')[0])
            const ref = change.split(':')[1].split('>')[0]
            const ref_prot = protein_changes[changeIdx].split(':')[1].split('>')[0]
            const alt = change.split('>')[1]
            const alt_prot = protein_changes[changeIdx].split(':')[2].split('(')[0]
            const allele_len_diff = alt.length - ref.length

            // skip synonymous variants for now
            if (ref_prot === alt_prot) {
                return
            }

            const screen_x = Math.floor(width * (loc / cDNA_length))

            if (allele_len_diff === 0) {
                ref_snp_loc.push({
                    x: screen_x,
                    y: bar_row_height + 0.5 * line_row_height + Math.floor(row_margin / 4),
                    r: line_row_height * 0.15,
                    color_hex: "#CB0000"
                })

                alt_snp_loc.push({
                    x: screen_x,
                    y: bar_row_height + 4.5 * line_row_height + Math.floor(row_margin / 4),
                    r: line_row_height * 0.15,
                    color_hex: "#CB0000"
                })
            } else if (allele_len_diff !== 0) {
                const ref_screen_len = Math.max(cDNA_scale(ref.length), 2)
                const alt_screen_len = Math.max(cDNA_scale(alt.length), 2)

                ref_indel_loc.push({
                    x: screen_x,
                    y: bar_row_height + 0.25 * line_row_height + Math.floor(row_margin / 4),
                    width: ref_screen_len,
                    height: 0.5 * line_row_height,
                    color_hex: allele_len_diff < 0 ? "#820000" : "#57B603"
                })

                alt_indel_loc.push({
                    x: screen_x,
                    y: bar_row_height + 4.25 * line_row_height + Math.floor(row_margin / 4),
                    width: alt_screen_len,
                    height: 0.5 * line_row_height,
                    color_hex: allele_len_diff < 0 ? "#820000" : "#57B603"
                })

                if (allele_len_diff % 3 !== 0) {
                    frameshift_loc.push({
                        x: screen_x,
                        y: bar_row_height + 4.25 * line_row_height + Math.floor(row_margin / 4),
                        width: width - screen_x,
                        height: 0.5 * line_row_height,
                        color_hex: "#B7DAE7"
                    })
                }
            }
            
            ref_alleles.push({
                x: screen_x,
                y: bar_row_height + 1.5 * line_row_height + Math.floor(row_margin / 4),
                t: ref_prot,
                highlight: (alt !== ref),
                anchor: "middle"
            })

            alt_alleles.push({
                x: screen_x,
                y: bar_row_height + 3.75 * line_row_height + Math.floor(row_margin / 4),
                t: alt_prot,
                highlight: (alt !== ref),
                anchor: "middle"
            })
        })

        return [ref_snp_loc, ref_indel_loc, ref_alleles, alt_snp_loc, alt_indel_loc, alt_alleles, frameshift_loc]
    }

    function redraw(): void {
		// empty vis div
		d3.select(vis).html(null); 

        // get dimensions
        const bar_row_height = Math.floor(height * bar_height_proportion)
        const line_row_height = Math.floor((height - 2 * bar_row_height) / (nrows - 2))
        const row_margin = Math.floor(line_row_height / 4)

        // check if we have the reference protein
        if (!alignmentData[0]) {
            return
        }

        // cDNA / protein alignment properties

        let exon_elements: Array<D3RectElem> = []
        let start_stop_lines: Array<D3LineElem> = []
        let splice_site_elements: Array<D3CircleElem> = []
        let splice_site_elements_alt: Array<D3CircleElem> = []
        let ref_PSM_bars: Array<D3RectElem> = []
        let x_axis_lines: Array<D3LineElem> = []

        // gather and sort exons
        const exon_list: Array<Exon> = $selectedTranscript!.exons.sort((a,b) => {
            return $selectedGene!.strand === '+' ? a.bp_from - b.bp_from : b.bp_to - a.bp_to
        })

        const cDNA_length = $selectedTranscript!.cDNA_sequence.length
        const exon_aligned_elements = drawExons(exon_list, cDNA_length, line_row_height, bar_row_height, row_margin)
        exon_elements = exon_aligned_elements[0]
        splice_site_elements = exon_aligned_elements[1]
        splice_site_elements_alt = exon_aligned_elements[2]

        // x axis for the reference protein
        x_axis_lines.push({
            x1: 0,
            x2: width,
            y1: bar_row_height + row_margin / 2,
            y2: bar_row_height + row_margin / 2,
            color_hex: "#707070"
        })

        // x axis for the alternative protein
        x_axis_lines.push({
            x1: 0,
            x2: width,
            y1: bar_row_height + 5 * line_row_height + row_margin / 2,
            y2: bar_row_height + 5 * line_row_height + row_margin / 2,
            color_hex: "#707070"
        })
        
        // align start and stop codons
        const start_codon_x = getScreenX_simple(exon_list, $selectedTranscript!.start[0], cDNA_length, width, $selectedGene!.strand === '+')
        const stop_codon_x = getScreenX_simple(exon_list, $selectedTranscript!.stop[0], cDNA_length, width, $selectedGene!.strand === '+')

        start_stop_lines.push({
            x1: start_codon_x,
            x2: start_codon_x,
            y1: bar_row_height + 2 * line_row_height + Math.floor(row_margin / 2),
            y2: bar_row_height + 3 * line_row_height - Math.floor(row_margin / 2),
            color_hex: "#000000",
            tooltiptext: "start"
        })

        start_stop_lines.push({
            x1: stop_codon_x,
            x2: stop_codon_x,
            y1: bar_row_height + 2 * line_row_height + Math.floor(row_margin / 2),
            y2: bar_row_height + 3 * line_row_height - Math.floor(row_margin / 2),
            color_hex: "#000000",
            tooltiptext: "stop"
        })

        // align and compute the PSM bars
        const max_protein_length = Math.floor($selectedTranscript!.cDNA_sequence.length / 3)
        const max_PSM_count = alignmentData[1] ? Math.max(Math.max(...alignmentData[0].PSM_count_total), Math.max(...alignmentData[1].PSM_count_total)) : Math.max(...alignmentData[0].PSM_count_total)

        ref_PSM_bars = drawPSMBars(alignmentData[0], max_PSM_count, max_protein_length, start_codon_x, bar_row_height, false, bar_row_height)

        // draw everything

        // create svg and create a group inside that is moved by means of margin
		const svg_vis = d3.select(vis)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height',  height + margin.top + margin.bottom)
			.append('g')
			//.attr('transform', `translate(${[margin.left, margin.top]})`)
            .on('mouseout', function() {
                d3.select('#gridline-X').style('opacity', 0)   // hide the gridline on mouseout
            })

        svg_vis.append('g').selectAll('exon')
			.data(exon_elements)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x + margin.left)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', '#888888')
            .attr('fill', (d) => d.color_hex)

        svg_vis.append('g').selectAll('x-axis')
            .data(x_axis_lines)
            .enter()
            .append('line')
            .attr('x1', (d) => d.x1 + margin.left)
            .attr('x2', (d) => d.x2 + margin.left)
            .attr('y1', (d) => d.y1 + margin.top)
            .attr('y2', (d) => d.y2 + margin.top)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 1.33)

        svg_vis.append('g').selectAll('splice-site-ref')
			.data(splice_site_elements)
			.enter()
			.append('circle')
            .attr('cx', (d) => d.x + margin.left)
            .attr('cy', (d) => d.y + margin.top)
            .attr('r', (d) => d.r)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)
            .on('mouseover', function() {
                d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
            })
            .on('mouseout', function() {
                d3.select('#gridline-X').style('opacity', 0)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
            })

        svg_vis.append('g').selectAll('splice-site-alt')
			.data(splice_site_elements_alt)
			.enter()
			.append('circle')
            .attr('cx', (d) => d.x + margin.left)
            .attr('cy', (d) => d.y + margin.top)
            .attr('r', (d) => d.r)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)
            .on('mouseover', function() {
                d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
            })
            .on('mouseout', function() {
                d3.select('#gridline-X').style('opacity', 0)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
            })

        svg_vis.append('g').selectAll('start-stop')
            .data(start_stop_lines)
            .enter()
            .append('line')
            .attr('x1', (d) => d.x1 + margin.left)
            .attr('x2', (d) => d.x2 + margin.left)
            .attr('y1', (d) => d.y1 + margin.top)
            .attr('y2', (d) => d.y2 + margin.top)
            .attr('stroke', (d) => d.color_hex)
            .attr('stroke-width', 2)
            .on('mouseover', function() {
                d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
            })
            .on('mouseout', function() {
                d3.select('#gridline-X').style('opacity', 0)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x1 + margin.left).attr('x2', d.x2 + margin.left)
            })

        svg_vis.append('g').selectAll('ref-psm-bar')
			.data(ref_PSM_bars)
			.enter()
			.append('rect')
            .attr('x', (d) => d.x + margin.left)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('stroke', 'none')
            .attr('fill', (d) => d.color_hex)
            
        // draw the axis
        const scale_top = d3.scaleLinear().domain([0, max_PSM_count]).range([bar_row_height, 0])
        const axisLeft = d3.axisLeft(scale_top).ticks(5)
        svg_vis.append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
            .attr('height', bar_row_height)
            .call(axisLeft)        

        const scale_bottom = d3.scaleLinear().domain([0, max_PSM_count]).range([0, bar_row_height])
        const axisLeft_bottom = d3.axisLeft(scale_bottom).ticks(5)
        svg_vis.append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + (margin.top +bar_row_height + 5 * line_row_height + row_margin) + ')')
            .call(axisLeft_bottom) 
        
        // align variants and alternative PSMs, if available
        if (alignmentData[1] && $selectedProteoform) {            
            const aligned_variants = drawAlleles(cDNA_length, line_row_height, bar_row_height, row_margin)
            const alt_PSM_bars = drawPSMBars(alignmentData[1], max_PSM_count, max_protein_length, 0, (bar_row_height + 5 * line_row_height + row_margin), true, bar_row_height)

            const ref_snp_loc: Array<D3CircleElem> = aligned_variants[0]
            const ref_indel_loc: Array<D3RectElem> = aligned_variants[1]
            const ref_alleles: Array<D3TextElem> = aligned_variants[2]
            const alt_snp_loc: Array<D3CircleElem> = aligned_variants[3]
            const alt_indel_loc: Array<D3RectElem> = aligned_variants[4]
            const alt_alleles: Array<D3TextElem> = aligned_variants[5]
            const frameshift_loc: Array<D3RectElem> = aligned_variants[6]

            svg_vis.append('g').selectAll('alt-frameshift-site')
                .data(frameshift_loc)
                .enter()
                .append('rect')
                .attr('x', (d) => d.x + margin.left)
                .attr('y', (d) => d.y + margin.top)
                .attr('width', (d) => d.width)
                .attr('height', (d) => d.height)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
                .on('mouseover', function() {
                    d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
                })
                .on('mouseout', function() {
                    d3.select('#gridline-X').style('opacity', 0)
                })
                .on('mousemove', function(event, d) {
                    d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
                })

            svg_vis.append('g').selectAll('ref-snp-site')
                .data(ref_snp_loc)
                .enter()
                .append('circle')
                .attr('cx', (d) => d.x + margin.left)
                .attr('cy', (d) => d.y + margin.top)
                .attr('r', (d) => d.r)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
                .on('mouseover', function() {
                    d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
                })
                .on('mouseout', function() {
                    d3.select('#gridline-X').style('opacity', 0)
                })
                .on('mousemove', function(event, d) {
                    d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
                })

            svg_vis.append('g').selectAll('alt-snp-site')
                .data(alt_snp_loc)
                .enter()
                .append('circle')
                .attr('cx', (d) => d.x + margin.left)
                .attr('cy', (d) => d.y + margin.top)
                .attr('r', (d) => d.r)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
                .on('mouseover', function() {
                    d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
                })
                .on('mouseout', function() {
                    d3.select('#gridline-X').style('opacity', 0)
                })
                .on('mousemove', function(event, d) {
                    d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
                })

            svg_vis.append('g').selectAll('ref-indel-site')
                .data(ref_indel_loc)
                .enter()
                .append('rect')
                .attr('x', (d) => d.x + margin.left)
                .attr('y', (d) => d.y + margin.top)
                .attr('width', (d) => d.width)
                .attr('height', (d) => d.height)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
                .on('mouseover', function() {
                    d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
                })
                .on('mouseout', function() {
                    d3.select('#gridline-X').style('opacity', 0)
                })
                .on('mousemove', function(event, d) {
                    d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
                })

            svg_vis.append('g').selectAll('alt-indel-site')
                .data(alt_indel_loc)
                .enter()
                .append('rect')
                .attr('x', (d) => d.x + margin.left)
                .attr('y', (d) => d.y + margin.top)
                .attr('width', (d) => d.width)
                .attr('height', (d) => d.height)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
                .on('mouseover', function() {
                    d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
                })
                .on('mouseout', function() {
                    d3.select('#gridline-X').style('opacity', 0)
                })
                .on('mousemove', function(event, d) {
                    d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
                })

            svg_vis.append('g').selectAll('ref-allele')
                .data(ref_alleles)
                .enter()
                .append('text')
                .attr('x', (d) => margin.left + d.x)
                .attr('y', (d) => margin.top + d.y)
                .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
                .attr('fill', (d) => d.highlight ? "red" : "black")
                .attr('text-anchor', (d) => d.anchor!)
                .text((d) => d.t)

            svg_vis.append('g').selectAll('alt-allele')
                .data(alt_alleles)
                .enter()
                .append('text')
                .attr('x', (d) => margin.left + d.x)
                .attr('y', (d) => margin.top + d.y)
                .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
                .attr('fill', (d) => d.highlight ? "red" : "black")
                .attr('text-anchor', (d) => d.anchor!)
                .text((d) => d.t)
                
            svg_vis.append('g').selectAll('alt-psm-bar')
                .data(alt_PSM_bars)
                .enter()
                .append('rect')
                .attr('x', (d) => d.x + margin.left)
                .attr('y', (d) => d.y + margin.top)
                .attr('width', (d) => d.width)
                .attr('height', (d) => d.height)
                .attr('stroke', 'none')
                .attr('fill', (d) => d.color_hex)
        }
        
        // create the gridline element that will be moved on interaction
        svg_vis.append('g').append('line')
            .attr('id', 'gridline-X')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', margin.top)
            .attr('y2', margin.top + height)
            .attr('stroke', '#334155')
            .attr('stroke-width', 1)
    }

    onDestroy(unsubscribe)
</script>

<style>
    .nobr {
        float: left;
    }
    #vis {
		width: 90%;
		height: 40vh;
		background-color: white;
        overflow: scroll;
	}
    #axis-title {
        width: 10%;
        height: 40vh;
        background-color: white;
        overflow: hidden;
    }
</style>

<div>
    <div id="axis-title" class="nobr" bind:this={vis_label}></div>
    <div id="vis" bind:this={vis}></div>
</div>