import * as d3 from "d3";
import type { Haplotype, Proteoform } from "../types/graph_nodes";

interface VarLoc {
    ref: string,
    alt: string,
    ref_loc: number,
    alt_loc: number
}

interface VarMapped {
    seq: string,
    loc: number
}

/**
 * Splits the sequence string into substring containing alleles and remaining sequences separately. 
 * Consider the reference sequence PEPTIDEK, and a haplotype containig two AA substitutions: 2:P>C and 6:E>A.
 * The sequence would be split into: ['PE', 'P', 'TID', 'E', 'K']
 * @param var_locations 
 * @param prot_start 
 * @param prot_end 
 * @param seq 
 * @param is_reference 
 * @returns 
 */
function splitSequenceString(var_locations: VarLoc[], prot_start: number, prot_end: number, seq: string, is_reference: boolean): string[] {
    const vars_filtered = var_locations.map(elem => ({
        seq: is_reference ? elem.ref : elem.alt, 
        loc: is_reference ? (elem.ref_loc - prot_start) : (elem.alt_loc - prot_start)
    } as VarMapped)).filter((elem: VarMapped) => ((elem.loc >= 0) && (elem.loc < seq.length)))

    let result: string[] = []

    if (vars_filtered.length > 0) {
        result.push(seq.slice(0, vars_filtered[0].loc))
        
        vars_filtered.forEach((elem:VarMapped, index: number) => {
            result.push(elem.seq)

            if (index < (vars_filtered.length - 1)) {
                result.push(seq.slice(elem.loc + elem.seq.length, vars_filtered[index+1].loc))
            } else if ((elem.loc+elem.seq.length) < seq.length) {
                result.push(seq.slice(elem.loc + elem.seq.length, seq.length))
            } else {
                result.push('')
            }
        })

    } else {
        result = [seq]
    }

    return result
}

function drawTooltipProteinSequence(display_text_ref: string[], display_text_alt: string[], mouseX: number, line_row_height: number, bar_row_height: number, margin: any, row_margin: number, start_codon_x: number, highlight_colour: string) {
    // clear element
    d3.select('#sequence-detail').html(null)

    // add group for the reference sequence
    d3.select('#sequence-detail').append('g').attr('id', 'ref-seq-tooltip')

    // background rectangle (draw first, set size later)
    d3.select('#ref-seq-tooltip').append('rect')
        .attr('id', 'ref-seq-background')
        .attr('fill', '#FFF')

    // show the reference sequence - alternate between black and highlight colour
    display_text_ref.forEach((elem_text:string, index:number) => {
        const current_text_width = (index > 0) ? (d3.select('#sequence-detail').node() as SVGGraphicsElement).getBBox().width : 0
        
        d3.select('#ref-seq-tooltip').append('text')
            .attr('x', mouseX + margin.left + start_codon_x + current_text_width)
            .attr('y', margin.top + bar_row_height + 1.5 * line_row_height + Math.floor(row_margin / 2))
            .attr('fill', ((index % 2) === 1) ? highlight_colour : "#000000")
            .text(elem_text)
    })

    // scale the background accordingly
    const ref_elem_bbox = (d3.select('#ref-seq-tooltip').node() as SVGGraphicsElement).getBBox()
    d3.select('#ref-seq-tooltip').attr('transform', 'translate(-' + ref_elem_bbox.width/2 + ',0)')
    d3.select('#ref-seq-background')
            .attr('width', ref_elem_bbox.width)
            .attr('height', ref_elem_bbox.height - row_margin)
            .attr('x', mouseX + margin.left + start_codon_x)
            .attr('y', margin.top + bar_row_height + line_row_height/2 + 2*row_margin)

    // show the alternative sequence if haplotype selected
    if (display_text_alt.length > 0) {
        // add group for the alternative sequence
        d3.select('#sequence-detail').append('g').attr('id', 'alt-seq-tooltip')

        // background rectangle - scale later
        d3.select('#alt-seq-tooltip').append('rect')
        .attr('id', 'alt-seq-background')
        .attr('fill', '#FFF')

        // show the alternative sequence - alternate between black and highlight colour
        display_text_alt.forEach((elem_text:string, index:number) => {
            const current_text_width = (index > 0) ? (d3.select('#alt-seq-tooltip').node() as SVGGraphicsElement).getBBox().width : 0

            d3.select('#alt-seq-tooltip').append('text')
                .attr('x', mouseX + margin.left + start_codon_x + current_text_width)
                .attr('y', margin.top + bar_row_height + 3.75 * line_row_height + Math.floor(row_margin / 2))
                .attr('fill', ((index % 2) === 1) ? highlight_colour : "#000000")
                .text(elem_text)
        })

        const alt_elem_bbox = (d3.select('#alt-seq-tooltip').node() as SVGGraphicsElement).getBBox()
        d3.select('#alt-seq-tooltip').attr('transform', 'translate(-' + alt_elem_bbox.width/2 + ',0)')
        d3.select('#alt-seq-background')
            .attr('width', alt_elem_bbox.width) 
            .attr('height', alt_elem_bbox.height - row_margin)
            .attr('x', mouseX + margin.left + start_codon_x)
            .attr('y', margin.top + bar_row_height + 3 * line_row_height + row_margin)
    }
}

export function mouseOverSequence(mouseX: number, width: number, line_row_height: number, bar_row_height: number, margin: any, max_protein_length: number, row_margin: number, start_codon_x: number, ref_protein: Proteoform, alt_protein: Proteoform, haplotype: Haplotype, highlight_colour: string = "#FF0000") {
    const canonical_seq = ref_protein.sequence
    const x_prot_ref = Math.floor(max_protein_length * (mouseX / width)) + 1

    // index of the first displayed AA
    const protein_start_ref = Math.max(Math.min(x_prot_ref - 6, canonical_seq.length), 0)
    // index of the last displayed AA + 1
    const protein_end_ref = Math.min(Math.max(x_prot_ref + 6, 0), canonical_seq.length)

    // since we want to highlight variant alleles, the displayed text has to be split up
    let display_text_ref: string[] = []
    let display_text_alt: string[] = []

    // store the fill displayed sequence at the beginning of the list (if no variants overlapping, this will stay)
    display_text_ref[0] = (protein_start_ref < protein_end_ref) ? canonical_seq.slice(protein_start_ref, protein_end_ref) : ""

    // process the alternative sequence only if haplotype is selected
    if (haplotype) {
        const haplotype_seq = alt_protein.sequence
        const x_prot_alt = Math.floor(max_protein_length * (mouseX / width)) + alt_protein.start_aa + 1

        const protein_start_alt = Math.max(Math.min(x_prot_alt - 6, haplotype_seq.length), 0)
        const protein_end_alt = Math.min(Math.max(x_prot_alt + 6, 0), haplotype_seq.length)

        // parse the string of protein changes
        const var_locations = alt_protein.protein_changes.split(';').map(elem => ({
            ref: elem.split(':')[1].split('>')[0], 
            alt: elem.split(':')[2].split('(')[0], 
            ref_loc: parseInt(elem.split(':')[0]), 
            alt_loc: parseInt(elem.split('>')[1].split(':')[0]) + alt_protein.start_aa
        }) as VarLoc)

        // split up the reference and alternative sequence by alleles to be highlighted
        display_text_ref = splitSequenceString(var_locations, protein_start_ref, protein_end_ref, display_text_ref[0], true)
        display_text_alt = splitSequenceString(var_locations, protein_start_alt, protein_end_alt, (protein_start_alt < protein_end_alt) ? haplotype_seq.slice(protein_start_alt, protein_end_alt) : "", false)
    }

    drawTooltipProteinSequence(display_text_ref, display_text_alt, mouseX, line_row_height, bar_row_height, margin, row_margin, start_codon_x, highlight_colour)
}

export function mouseOverPSM(mouseX: number, proteinX1: number, proteinX2: number, width: number, line_row_height: number, bar_row_height: number, margin: any, max_protein_length: number, row_margin: number, start_codon_x: number, ref_protein: Proteoform, alt_protein: Proteoform, haplotype: Haplotype, highlight_colour: string = "#FF0000") {
    const canonical_seq = ref_protein.sequence
    const x1_prot_ref = proteinX1
    const x2_prot_ref = proteinX2

    // index of the first displayed AA
    const protein_start_ref = Math.max(Math.min(x1_prot_ref, canonical_seq.length), 0)
    // index of the last displayed AA + 1
    const protein_end_ref = Math.min(Math.max(x2_prot_ref, 0), canonical_seq.length)
    // index of the first displayed AA of the upstream sequence
    const protein_upstream_ref = Math.max(protein_start_ref - 4, 0)
    // index of the last displayed AA of the downstream sequence + 1
    const protein_downstream_ref = Math.min(protein_end_ref+4, canonical_seq.length)

    // since we want to highlight variant alleles, the displayed text has to be split up
    let split_text_ref: string[][] = []
    let split_text_alt: string[][] = []

    // store the full displayed sequence
    split_text_ref[0] = [(protein_upstream_ref < protein_start_ref) ? canonical_seq.slice(protein_upstream_ref, protein_start_ref) : ""]
    split_text_ref[1] = [(protein_start_ref < protein_end_ref) ? canonical_seq.slice(protein_start_ref, protein_end_ref) : ""]
    split_text_ref[2] = [(protein_end_ref < protein_downstream_ref) ? canonical_seq.slice(protein_end_ref, protein_downstream_ref) : ""]

    // process the alternative sequence only if haplotype is selected
    if (haplotype) {
        const haplotype_seq = alt_protein.sequence
        const x1_prot_alt = proteinX1 + alt_protein.start_aa
        const x2_prot_alt = proteinX2 + alt_protein.start_aa

        // index of the first displayed AA
        const protein_start_alt = Math.max(Math.min(x1_prot_alt, haplotype_seq.length), 0)
        // index of the last displayed AA + 1
        const protein_end_alt = Math.min(Math.max(x2_prot_alt, 0), haplotype_seq.length)
        // index of the first displayed AA of the upstream sequence
        const protein_upstream_alt = Math.max(protein_start_alt - 4, 0)
        // index of the last displayed AA of the downstream sequence + 1
        const protein_downstream_alt = Math.min(protein_end_alt + 4, haplotype_seq.length)

        // parse the string of protein changes
        const var_locations = alt_protein.protein_changes.split(';').map(elem => ({
            ref: elem.split(':')[1].split('>')[0], 
            alt: elem.split(':')[2].split('(')[0], 
            ref_loc: parseInt(elem.split(':')[0]), 
            alt_loc: parseInt(elem.split('>')[1].split(':')[0]) + alt_protein.start_aa
        }) as VarLoc)

        // split up the reference and alternative sequence by alleles to be highlighted
        split_text_ref[0] = splitSequenceString(var_locations, protein_upstream_ref, protein_start_ref, split_text_ref[0][0], true)
        split_text_ref[1] = splitSequenceString(var_locations, protein_start_ref, protein_end_ref, split_text_ref[1][0], true)
        split_text_ref[2] = splitSequenceString(var_locations, protein_end_ref, protein_downstream_ref, split_text_ref[2][0], true)

        split_text_alt[0] = splitSequenceString(var_locations, protein_upstream_alt, protein_start_alt, (protein_upstream_alt < protein_start_alt) ? haplotype_seq.slice(protein_upstream_alt, protein_start_alt): "", false)
        split_text_alt[1] = splitSequenceString(var_locations, protein_start_alt, protein_end_alt, (protein_start_alt < protein_end_alt) ? haplotype_seq.slice(protein_start_alt, protein_end_alt): "", false)
        split_text_alt[2] = splitSequenceString(var_locations, protein_end_alt, protein_downstream_alt, (protein_end_alt < protein_downstream_alt) ? haplotype_seq.slice(protein_end_alt, protein_downstream_alt): "", false)
    }

    // flatten the split up sequences into one array, separate the peptide from upstream and downstream residues by a dot
    const display_text_ref = [...split_text_ref[0], '', '.', '', ...split_text_ref[1], '', '.', '', ...split_text_ref[2]]
    const display_text_alt = haplotype ? [...split_text_alt[0], '', '.', '', ...split_text_alt[1], '', '.', '', ...split_text_alt[2]] : []

    // x-coordinate of the middle point of the rectangle
    //const mouseX = mouseX1 + (mouseX2 - mouseX1)/2

    drawTooltipProteinSequence(display_text_ref, display_text_alt, mouseX, line_row_height, bar_row_height, margin, row_margin, start_codon_x, highlight_colour)
}