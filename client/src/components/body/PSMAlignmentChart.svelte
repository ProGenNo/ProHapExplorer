<script lang="ts">
    import * as d3 from 'd3';
    import PsmAlignmentLegend from './PSMAlignmentLegend.svelte';
    import { onMount, onDestroy } from 'svelte';
    import { mouseOverPSM, mouseOverSequence } from '../../tools/mouseOverEventHandlers';
    import { filteredPeptides, selectedTranscript, selectedHaplotype, selectedProteoform, selectedGene } from '../../stores/stores'
    import { alignPSMs, alignPeptides } from '../../tools/alignSequences'
    import { getScreenX_simple } from '../../tools/alignExons'
    import { createAlleleElements, createExonElements, createPSMBarElements, createPeptideLineElements } from '../../tools/mapToScreenSpace'
    import type { Proteoform, Exon, Transcript } from '../../types/graph_nodes'
    import type { PSMAlignment, AlignedPeptide } from '../../types/alignment_types'
    import type { D3LineElem, D3RectElem, D3TextElem, D3CircleElem } from '../../types/d3_elements'

    let vis: HTMLDivElement; // binding with div for visualization
    let vis_label: HTMLDivElement;
    let width = 10
    let height = 10
    const nrows = 7
    const bar_height_proportion = 0.35

    let PSMAlignmentData: Array<PSMAlignment | null> = [null, null]   // two alignment objects - 0: reference protein, 1: alternative protein
    let peptideAlignmentData: Array<AlignedPeptide[] | null> = [null, null]   // two alignment objects - 0: reference protein, 1: alternative protein

    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
    };

    const unsubscribe = filteredPeptides.subscribe(data => {
        if (data.display_PSMs) {
            PSMAlignmentData[0] = data.ref.length === 0 ? null : alignPSMs(data.ref)
            PSMAlignmentData[1] = $selectedHaplotype ? alignPSMs(data.alt) : null
        } else {
            peptideAlignmentData[0] = data.ref.length === 0 ? null : alignPeptides(data.ref)
            peptideAlignmentData[1] = $selectedHaplotype ? alignPeptides(data.alt) : null
        }

        console.log('Showing ' + (data.display_PSMs ? 'PSMs' : 'Peptides'))

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

    // the background rectangle catches mouse over events and shows the grid line and sequence
    function drawBackground(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, start_codon_x: number, max_protein_length: number): void {
        svg_vis.append('rect')
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#FFFFFF')
            .on('mouseenter', function(event: MouseEvent) {
                d3.select('#gridline-X').style('opacity', 0.2)
                d3.select('#gridline-X').attr('x1', event.offsetX).attr('x2', event.offsetX)
                mouseOverSequence(event.offsetX - margin.left - start_codon_x,
                    width,
                    line_row_height,
                    bar_row_height,
                    margin,
                    max_protein_length,
                    row_margin,
                    start_codon_x,
                    $selectedTranscript!.canonical_protein,
                    $selectedProteoform!,
                    $selectedHaplotype!
                )
            })
            .on('mousemove', function(event: MouseEvent) {
                d3.select('#gridline-X').attr('x1', event.offsetX).attr('x2', event.offsetX)
                mouseOverSequence(event.offsetX - margin.left - start_codon_x,
                    width,
                    line_row_height,
                    bar_row_height,
                    margin,
                    max_protein_length,
                    row_margin,
                    start_codon_x,
                    $selectedTranscript!.canonical_protein,
                    $selectedProteoform!,
                    $selectedHaplotype!
                )
            })      
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

    function drawXAxis(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number): void {
        let x_axis_lines: Array<D3LineElem> = []        

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
    }

    function drawExonsSpliceSites(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, exon_list: Exon[], cDNA_length: number, start_codon_x: number, stop_codon_x: number): void {
        let start_stop_lines: Array<D3LineElem> = []       

        const exon_aligned_elements = createExonElements(width, $selectedGene!.strand, exon_list, cDNA_length, line_row_height, bar_row_height, row_margin)
        const exon_elements = exon_aligned_elements[0]
        const splice_site_elements = exon_aligned_elements[1]
        const splice_site_elements_alt = exon_aligned_elements[2]

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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x1 + margin.left).attr('x2', d.x2 + margin.left)
            })
    }

    function drawYAxis(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, max_PSM_count: number): void {
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
    }

    function drawReferencePeptides(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, max_protein_length: number, start_codon_x: number): void {
        let ref_peptide_elements: D3RectElem[] = []
        
        if ($filteredPeptides.display_PSMs && PSMAlignmentData[0]) {
            const max_PSM_count = PSMAlignmentData[1] ? Math.max(Math.max(...PSMAlignmentData[0].PSM_count_total), Math.max(...PSMAlignmentData[1].PSM_count_total)) : Math.max(...PSMAlignmentData[0].PSM_count_total)
            ref_peptide_elements = createPSMBarElements(width, PSMAlignmentData[0], max_PSM_count, max_protein_length, start_codon_x, bar_row_height, false, bar_row_height)
            drawYAxis(svg_vis, line_row_height, bar_row_height, row_margin, max_PSM_count)
        } else if (!$filteredPeptides.display_PSMs && peptideAlignmentData[0]) {
            ref_peptide_elements = createPeptideLineElements(width, peptideAlignmentData[0], max_protein_length, start_codon_x, bar_row_height, false)
        }

        svg_vis.append('g').selectAll('ref-psm-bar')
            .data(ref_peptide_elements)
            .enter()
            .append('rect')
            .attr('class', 'stroke-none hover:stroke-gray-700')
            .attr('x', (d) => d.x + margin.left)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('fill', (d) => d.color_hex)
            .attr('id', (d) => d.id!)
            .on('mouseenter', () => {                
                d3.select('#gridline-X').style('opacity', 0)
            })
            .on('mouseover', function(event: MouseEvent, d) {
                event.stopPropagation()
                const aa_pos = (event.target as HTMLElement).id.split('_').slice(1).map(pos => Number.parseInt(pos))
                mouseOverPSM( 
                    aa_pos[0], 
                    aa_pos[1], 
                    width, 
                    line_row_height,
                    bar_row_height,
                    margin,
                    max_protein_length,
                    row_margin,
                    start_codon_x,
                    $selectedTranscript!.canonical_protein,
                    $selectedProteoform!,
                    $selectedHaplotype!
                )
            })
            .on('mouseleave', function() {
                d3.select('#sequence-detail').html(null)
            })
    }

    function drawAltPeptides(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, max_protein_length: number, start_codon_x: number): void {
        let alt_peptide_elements: D3RectElem[] = []

        if ($filteredPeptides.display_PSMs && PSMAlignmentData[1]) {
            const max_PSM_count = PSMAlignmentData[0] ? Math.max(Math.max(...PSMAlignmentData[0].PSM_count_total), Math.max(...PSMAlignmentData[1].PSM_count_total)) : Math.max(...PSMAlignmentData[1].PSM_count_total)
            alt_peptide_elements = createPSMBarElements(width, PSMAlignmentData[1], max_PSM_count, max_protein_length, start_codon_x, (bar_row_height + 5 * line_row_height + row_margin), true, bar_row_height)
            if (!PSMAlignmentData[0]) {
                drawYAxis(svg_vis, line_row_height, bar_row_height, row_margin, max_PSM_count)
            }
        } else if (!$filteredPeptides.display_PSMs && peptideAlignmentData[1]) {
            alt_peptide_elements = createPeptideLineElements(width, peptideAlignmentData[1], max_protein_length, start_codon_x, (bar_row_height + 5 * line_row_height + row_margin), true)
        }

        svg_vis.append('g').selectAll('alt-psm-bar')
            .data(alt_peptide_elements)
            .enter()
            .append('rect')
            .attr('class', 'stroke-none hover:stroke-gray-700')
            .attr('x', (d) => d.x + margin.left)
            .attr('y', (d) => d.y + margin.top)
            .attr('width', (d) => d.width)
            .attr('height', (d) => d.height)
            .attr('fill', (d) => d.color_hex)
            .attr('id', (d) => d.id!)
            .on('mouseenter', () => {                
                d3.select('#gridline-X').style('opacity', 0)
            })
            .on('mouseover', function(event: MouseEvent, d) {
                event.stopPropagation()
                const aa_pos = (event.target as HTMLElement).id.split('_').slice(1).map(pos => Number.parseInt(pos))              
                mouseOverPSM( 
                    aa_pos[0], 
                    aa_pos[1], 
                    width, 
                    line_row_height,
                    bar_row_height,
                    margin,
                    max_protein_length,
                    row_margin,
                    start_codon_x,
                    $selectedTranscript!.canonical_protein,
                    $selectedProteoform!,
                    $selectedHaplotype!
                )
            })
            .on('mouseleave', function() {
                d3.select('#sequence-detail').html(null)
            })
    }

    function drawAlleles(svg_vis: d3.Selection<SVGGElement, unknown, null, undefined>, line_row_height: number, bar_row_height: number, row_margin: number, cDNA_length: number) {
        const aligned_variants = createAlleleElements(width, $selectedProteoform!, cDNA_length, line_row_height, bar_row_height, row_margin)

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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
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
            .attr('cursor', 'default')
            .text((d) => d.t)
            .on('mouseover', function(event: MouseEvent) {
                event.stopPropagation()              
                d3.select('#sequence-detail').html(null)
                d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
            })
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
            })

        svg_vis.append('g').selectAll('alt-allele')
            .data(alt_alleles)
            .enter()
            .append('text')
            .attr('x', (d) => margin.left + d.x)
            .attr('y', (d) => margin.top + d.y)
            .attr('font-weight', (d) => d.highlight ? "bold" : "normal")
            .attr('fill', (d) => d.highlight ? "red" : "black")
            .attr('text-anchor', (d) => d.anchor!)
            .attr('cursor', 'default')
            .text((d) => d.t)
            .on('mouseover', function(event: MouseEvent) {
                event.stopPropagation()              
                d3.select('#sequence-detail').html(null)
                d3.select('#gridline-X').transition().duration(200).style('opacity', 1)
            })
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0.2)
            })
            .on('mousemove', function(event, d) {
                d3.select('#gridline-X').attr('x1', d.x + margin.left).attr('x2', d.x + margin.left)
            })
    }
 
    function redraw(): void {
		// empty vis div
		d3.select(vis).html(null); 

        // get dimensions
        const bar_row_height = Math.floor(height * bar_height_proportion)
        const line_row_height = Math.floor((height - 2 * bar_row_height) / (nrows - 2))
        const row_margin = Math.floor(line_row_height / 4)

        // check if we have any peptides
        if (($filteredPeptides.display_PSMs && !PSMAlignmentData[0] && !PSMAlignmentData[1]) || (!$filteredPeptides.display_PSMs && !peptideAlignmentData[0] && !peptideAlignmentData[1])) {
            d3.select(vis).html("<h5>There are no matching peptides to this protein.</h5>")
            return
        }

        // cDNA / protein alignment properties
        let ref_PSM_bars: Array<D3RectElem> = []        

        // gather and sort exons
        const exon_list: Array<Exon> = $selectedTranscript!.exons.sort((a,b) => {
            return $selectedGene!.strand === '+' ? a.bp_from - b.bp_from : b.bp_to - a.bp_to
        })
        const cDNA_length = $selectedTranscript!.cDNA_sequence.length
        
        // align start and stop codons
        const start_codon_x = getScreenX_simple(exon_list, $selectedTranscript!.start[0], cDNA_length, width, $selectedGene!.strand === '+')
        const stop_codon_x = getScreenX_simple(exon_list, $selectedTranscript!.stop[0], cDNA_length, width, $selectedGene!.strand === '+')

        // align and compute the PSM bars
        const max_protein_length = Math.floor($selectedTranscript!.cDNA_sequence.length / 3)
        
        // draw everything

        // create svg and create a group inside that is moved by means of margin
		const svg_vis = d3.select(vis)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height',  height + margin.top + margin.bottom)
			.append('g')
            .on('mouseleave', function() {
                d3.select('#gridline-X').style('opacity', 0)
                d3.select('#sequence-detail').html(null)
            })
        
        drawBackground(svg_vis, line_row_height, bar_row_height, row_margin, start_codon_x, max_protein_length)
        drawXAxis(svg_vis, line_row_height, bar_row_height, row_margin)
        drawExonsSpliceSites(svg_vis, line_row_height, bar_row_height, row_margin, exon_list, cDNA_length, start_codon_x, stop_codon_x)
        drawReferencePeptides(svg_vis, line_row_height, bar_row_height, row_margin, max_protein_length, start_codon_x)
        
        // align variants and alternative PSMs, if available
        if (($filteredPeptides.display_PSMs && PSMAlignmentData[1] && $selectedProteoform) || (!$filteredPeptides.display_PSMs && peptideAlignmentData[1] && $selectedProteoform)) {            
            drawAltPeptides(svg_vis, line_row_height, bar_row_height, row_margin, max_protein_length, start_codon_x)
            drawAlleles(svg_vis, line_row_height, bar_row_height, row_margin, cDNA_length)
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

        svg_vis.append('g').attr('id', 'sequence-detail').attr('background', 'lightblue')
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
    <div class='mt-4 mb-4'>
        <PsmAlignmentLegend psm_group_colors={PSMAlignmentData[0] ? PSMAlignmentData[0].PSM_group_colours : []} psm_group_names={PSMAlignmentData[0] ? PSMAlignmentData[0].PSM_group_names : []}/>
    </div>
</div>