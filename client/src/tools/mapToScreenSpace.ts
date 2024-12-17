import { getScreenX_simple } from '../tools/alignExons'
import * as d3 from 'd3';
import type { D3CircleElem, D3LineElem, D3RectElem, D3TextElem } from "../types/d3_elements"
import type { Proteoform, Exon } from "../types/graph_nodes"
import type { PSMAlignment, AlignedPeptide } from "../types/alignment_types"


export function createAlleleElements(width: number, prot_haplotype: Proteoform, cDNA_length: number, line_row_height: number, bar_row_height: number, row_margin: number): Array<Array<any>> {
    let ref_snp_loc: Array<D3CircleElem> = []
    let ref_indel_loc: Array<D3RectElem> = []
    let ref_alleles: Array<D3TextElem> = []
    let alt_snp_loc: Array<D3CircleElem> = []
    let alt_indel_loc: Array<D3RectElem> = []
    let alt_alleles: Array<D3TextElem> = []
    let frameshift_loc: Array<D3RectElem> = []

    const cDNA_scale = d3.scaleLinear().domain([0, cDNA_length]).range([0, width])

    const protein_changes = prot_haplotype.protein_changes.split(';')

    prot_haplotype.cDNA_changes.split(';').forEach((change: string, changeIdx: number) => {            
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

export function createExonElements(width: number, strand: string, exon_list: Array<Exon>, cDNA_length: number, line_row_height: number, bar_row_height: number, row_margin: number): Array<Array<any>> {
    let exon_elements: Array<D3RectElem> = []
    let splice_site_elements: Array<D3CircleElem> = []
    let splice_site_elements_alt: Array<D3CircleElem> = []

    // align exon rectangles and splice sites 
    exon_list.forEach((exon, exon_idx) => {
        const exon_screen_from = getScreenX_simple(exon_list, exon.bp_from, cDNA_length, width, strand === '+')
        const exon_screen_to = getScreenX_simple(exon_list, exon.bp_to, cDNA_length, width, strand === '+')

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

export function createPSMBarElements(width: number, alignedPSMs: PSMAlignment, max_PSM_count: number, max_protein_length: number, start_codon_x: number, y_start: number, flip_scale: boolean, bar_row_height: number): Array<D3RectElem> {
    let PSM_bars: Array<D3RectElem> = []

    const screen_PSMcount_factor = bar_row_height / max_PSM_count
    const screen_protein_factor = width / max_protein_length
    const min_bar_height = 2

    let x_position = start_codon_x + Math.floor(alignedPSMs.aa_pos[0] * screen_protein_factor)

    // make sure the bar has at least the minimum height, but only if there are any relevant PSMs
    let y_value = alignedPSMs.PSM_count_groupwise.map(val => {
        return val[0] > 0 ? Math.max(Math.floor(val[0] * screen_PSMcount_factor), min_bar_height) : 0
    })

    for (let i=1; i < alignedPSMs.aa_pos.length; i++) {
        let next_x_value = start_codon_x + Math.floor(alignedPSMs.aa_pos[i] * screen_protein_factor)
        let y_position = 0

        for (let j=0; j < y_value.length; j++) {
            if (y_value[j] > 0) {                    
                PSM_bars.push({
                    x: x_position,
                    y: flip_scale ? y_start - y_position : y_start - y_position - y_value[j],
                    width: next_x_value - x_position,
                    height: y_value[j],
                    color_hex: alignedPSMs.PSM_group_colours[j]
                })

                y_position += y_value[j]
            }
        }

        x_position = next_x_value

        // make sure the bar has at least the minimum height, but only if there are any relevant PSMs
        y_value = alignedPSMs.PSM_count_groupwise.map(val => {
            return val[i] > 0 ? Math.max(Math.floor(val[i] * screen_PSMcount_factor), min_bar_height) : 0
        })
    }

    return PSM_bars
}

export function createPeptideLineElements(width: number, alignedPeptides: AlignedPeptide[], max_protein_length: number, start_codon_x: number, y_start: number, flip_scale: boolean, bar_row_height: number): D3RectElem[] {
    let peptide_elements: D3RectElem[] = []

    const screen_protein_factor = width / max_protein_length
    const peptide_row_count = Math.max(...alignedPeptides.map(elem => elem.y_offset)) + 1
    const peptide_row_margin = 3
    const peptide_row_height_default = 8
    const peptide_row_height = 8 // Math.min(peptide_row_count / ( bar_row_height - (peptide_row_count-1) * peptide_row_margin ), peptide_row_height_default)

    alignedPeptides.forEach(element => {
        peptide_elements.push({
            x: start_codon_x + Math.floor(element.aa_pos * screen_protein_factor),
            y: flip_scale ? y_start + element.y_offset * (peptide_row_height + peptide_row_margin) : y_start - element.y_offset * (peptide_row_height + peptide_row_margin) - peptide_row_height,
            height: peptide_row_height,
            width: Math.floor(element.length * screen_protein_factor),
            color_hex: element.colour
        })
    });

    return peptide_elements
}