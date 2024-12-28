import { cdna2amino } from './translation'
import { ProteinRegionType } from '../types/alignment_types'
import type { AlignedSequenceSegment, Alignment, PSMAlignment, AlignedPeptide } from '../types/alignment_types'
import type { Proteoform, Peptide } from '../types/graph_nodes'
//import type { Alignment } from './alignSequences_old'

function getAffectedCodons(loc: number, allele_len: number, reading_frame: number) {
    const bpFrom = Math.floor((loc - reading_frame) / 3) * 3 + reading_frame
    const bpTo = Math.ceil((loc + allele_len - reading_frame) / 3) * 3 + reading_frame

    return [bpFrom, bpTo]
}

export function mergeOverlappingRegions(all_regions: Array<Array<number>>) {
    let currentRegions = 0
    let previousLoc = 0
    let result: Array<Array<number>> = []

    interface Event {
        loc: number,
        is_start: boolean
    }

    let all_events: Array<Event> = []
    all_regions.forEach(region => {
        all_events.push({loc: region[0], is_start: true})
        all_events.push({loc: region[1], is_start: false})
    })

    all_events.sort((a,b) => (a.loc !== b.loc) ? (a.loc - b.loc) : (a.is_start ? 1 : -1)).forEach(evt => {
        if (evt.is_start) {
            if (currentRegions === 0) {
                previousLoc = evt.loc
            }
            currentRegions++

        } else {
            currentRegions--
            if (currentRegions === 0) {
                result.push([previousLoc, evt.loc])
            }
        }
    })

    return result
}

export function alignSequences(ref_protein_seq: string, alt_protein_seq: string, ref_cDNA_seq: string, cDNA_changes: string, protein_changes: string, reading_frame: number, UTR_codons: number): Alignment {
    let result_segments: Array<AlignedSequenceSegment> = []
    let alt_cDNA_seq = ref_cDNA_seq
    let aligned_alt_cDNA = ref_cDNA_seq
    let aligned_ref_cDNA = ref_cDNA_seq
    let UTR_frameshift_len = 0
    let mORF_frameshift_len = 0
    let ref_align_offset = 0
    let alt_align_offset = 0
    const alt_start_codon = UTR_codons * 3 + reading_frame

    const protein_change_list = protein_changes.split(';')

    cDNA_changes.split(';').forEach((change, changeIdx) => {
        const loc = parseInt(change.split(':')[0])
        const ref = change.split(':')[1].split('>')[0]
        const alt = change.split('>')[1]
        const allele_len_diff = alt.length - ref.length

        alt_cDNA_seq = alt_cDNA_seq.slice(0, loc) + alt + alt_cDNA_seq.slice(loc + ref.length, alt_cDNA_seq.length)
        aligned_alt_cDNA = aligned_alt_cDNA.slice(0, loc) + alt + aligned_alt_cDNA.slice(loc + ref.length, aligned_alt_cDNA.length)

        if (allele_len_diff < 0) {
            const backup_cDNA = aligned_alt_cDNA
            aligned_alt_cDNA = backup_cDNA.slice(0, loc + alt.length)
            for (let i = 0; i < -allele_len_diff; i++) {
                aligned_alt_cDNA += 'x'
            }
            aligned_alt_cDNA += backup_cDNA.slice(loc + alt.length, backup_cDNA.length)

        } else if (allele_len_diff > 0) {
            const backup_cDNA = aligned_ref_cDNA
            aligned_ref_cDNA = backup_cDNA.slice(0, loc + ref.length)
            for (let i = 0; i < allele_len_diff; i++) {
                aligned_ref_cDNA += 'x'
            }
            aligned_ref_cDNA += backup_cDNA.slice(loc + ref.length, backup_cDNA.length)
        }

        if (loc < alt_start_codon) {
            if (ref.length !== alt.length) {
                UTR_frameshift_len += allele_len_diff
            }
        } else {
            const loc_ref = loc - UTR_frameshift_len - mORF_frameshift_len
            const rf_ref = (reading_frame - UTR_frameshift_len) % 3
            const affected_ref_region = getAffectedCodons(loc_ref + ref_align_offset, Math.max(ref.length, alt.length), rf_ref)
            const affected_alt_region = getAffectedCodons(loc + alt_align_offset, Math.max(ref.length, alt.length), reading_frame)
            const ref_protein_loc = parseInt(protein_change_list[changeIdx].split(':')[0])

            // TODO: fix indels -> show what's been added or removed

            if ((result_segments.length > 0) && (affected_alt_region[0] <= result_segments[result_segments.length - 1].bp_to)) {
                const previous_ref_loc = result_segments[result_segments.length - 1].ref_loc
                const previous_alt_loc = result_segments[result_segments.length - 1].bp_from
                const new_ref_cDNA = aligned_ref_cDNA.slice(previous_ref_loc, affected_ref_region[1])
                const new_alt_cDNA = aligned_alt_cDNA.slice(previous_alt_loc, affected_alt_region[1])

                result_segments[result_segments.length - 1] = {
                    ref_cDNA: new_ref_cDNA,
                    alt_cDNA: new_alt_cDNA,
                    ref_loc: previous_ref_loc,
                    bp_from: previous_alt_loc,
                    bp_to: affected_alt_region[1],
                    ref_protein: cdna2amino(new_ref_cDNA),
                    alt_protein: cdna2amino(new_alt_cDNA),
                    type: ProteinRegionType.mORF
                }
            }

            else if (ref_protein_loc < (ref_protein_seq.length + UTR_codons)) {
                const ref_cDNA = aligned_ref_cDNA.slice(affected_ref_region[0], affected_ref_region[1])
                const alt_cDNA = aligned_alt_cDNA.slice(affected_alt_region[0], affected_alt_region[1])

                result_segments.push({
                    ref_cDNA: ref_cDNA,
                    alt_cDNA: alt_cDNA,
                    ref_loc: affected_ref_region[0],
                    bp_from: affected_alt_region[0],
                    bp_to: affected_alt_region[1],
                    ref_protein: cdna2amino(ref_cDNA),
                    alt_protein: cdna2amino(alt_cDNA),
                    type: ProteinRegionType.mORF
                })
            }

            if (ref.length !== alt.length) {
                mORF_frameshift_len += allele_len_diff

                if (allele_len_diff < 0) {
                    alt_align_offset -= allele_len_diff // subtract as the length difference is negative
                } else {
                    ref_align_offset += allele_len_diff
                }
            }
        }

    });

    result_segments.push({
        ref_cDNA: ref_cDNA_seq.slice(0, alt_start_codon - UTR_frameshift_len),
        alt_cDNA: alt_cDNA_seq.slice(0, alt_start_codon),
        ref_protein: '-',
        alt_protein: alt_protein_seq.slice(0, UTR_codons),
        ref_loc: 0,
        bp_from: 0,
        bp_to: Math.max(alt_start_codon, alt_start_codon - UTR_frameshift_len),
        type: ProteinRegionType.UTR_5
    })

    result_segments.push({
        ref_cDNA: ref_cDNA_seq.slice(alt_start_codon - UTR_frameshift_len + ref_protein_seq.length * 3, ref_cDNA_seq.length),
        alt_cDNA: alt_cDNA_seq.slice(alt_start_codon + ref_protein_seq.length * 3, alt_cDNA_seq.length),
        ref_protein: '-',
        alt_protein: alt_protein_seq.slice(UTR_codons + ref_protein_seq.length + Math.floor((UTR_frameshift_len + mORF_frameshift_len) / 3), alt_protein_seq.length),
        ref_loc: alt_start_codon - UTR_frameshift_len + ref_protein_seq.length * 3,
        bp_from: alt_start_codon + ref_protein_seq.length * 3,
        bp_to: alt_cDNA_seq.length - 1,
        type: ProteinRegionType.UTR_3
    })

    return { 
        segments: result_segments.sort((a, b) => (a.bp_to - b.bp_to)),
        alt_cDNA: aligned_alt_cDNA,
        ref_cDNA: aligned_ref_cDNA,
        alt_protein: alt_protein_seq,
        ref_protein: ref_protein_seq
    }
}

export function alignPSMs(peptides: Peptide[], group_names: string[] = ['proteoform-specific', 'protein-specific', 'multi-gene'], group_colours: string[] = ["#01508c", "#73B2E3", "#EECC1C"], highlight_category: string = "pep_class2"): PSMAlignment {
    const all_group_names = (highlight_category === "pep_class2") ? group_names : ["other"].concat(group_names)
    
    let result: PSMAlignment = {
        aa_pos: [],
        PSM_count_total: [],
        PSM_count_groupwise: all_group_names.map(elem => []),   // create as many arrays as there are groups 
        PSM_group_names: all_group_names,
        PSM_group_colours: (highlight_category === "pep_class2") ? group_colours : group_colours.slice(0, all_group_names.length)
    }

    // first, aggregate the count of matching peptides with each position

    interface AlignmentEvent {
        type: string,       // 'start' or 'end' of the peptide
        pep_group: number   // group this PSM belongs to
        value: number,      // number of PSMs matched
        pos: number         // the position of this point
    }

    let eventQueue: Array<AlignmentEvent> = []

    peptides.forEach((pep, idx) => {
        if (highlight_category === "pep_class2") {
            eventQueue.push({
                type: 'start',
                pep_group: group_names.indexOf(pep.class_2),
                value: pep.PSM_PEP.length,
                pos: pep.position!
            })
            eventQueue.push({
                type: 'end',
                value: pep.PSM_PEP.length,
                pep_group: group_names.indexOf(pep.class_2),
                pos: pep.position! + pep.length
            })
        } else {
            group_names.forEach((category, cat_idx) => {
                const PSMs = pep.matching_spectra.filter(spec => spec.sample[highlight_category] === category)
                if (PSMs.length > 0) {
                    eventQueue.push({
                        type: 'start',
                        pep_group: cat_idx+1,
                        value: PSMs.length,
                        pos: pep.position!
                    })
                    eventQueue.push({
                        type: 'end',
                        pep_group: cat_idx+1,
                        value: PSMs.length,
                        pos: pep.position! + pep.length
                    })
                }
            })

            const PSMs = pep.matching_spectra.filter(spec => !group_names.includes(spec.sample[highlight_category]))
            if (PSMs.length > 0) {
                eventQueue.push({
                    type: 'start',
                    pep_group: 0,
                    value: PSMs.length,
                    pos: pep.position!
                })
                eventQueue.push({
                    type: 'end',
                    pep_group: 0,
                    value: PSMs.length,
                    pos: pep.position! + pep.length
                })
            }
        }
    })

    eventQueue.sort((a,b) => {return a.pos - b.pos})

    // sweep-line -- browse the protein start to end, aggregate PSM counts

    let current_pos = 0                                 // position of the sweep line
    let current_value = all_group_names.map(elem => 0)      // # current PSM count per group

    eventQueue.forEach((evt) => {
        current_pos = evt.pos        

        if (evt.type === 'start') {
            current_value[evt.pep_group] += evt.value
        }
        else if (evt.type === 'end') {            
            current_value[evt.pep_group] -= evt.value
        }

        result.aa_pos.push(current_pos)
        for (let i=0; i < all_group_names.length; i++) {            
            result.PSM_count_groupwise[i].push(current_value[i])
        }
        result.PSM_count_total.push(Math.max(...current_value))
    })

    return result
}

export function alignPeptides(peptides: Peptide[], group_names: string[] = ['proteoform-specific', 'protein-specific', 'multi-gene'], group_colours: string[] = ["#01508c", "#73B2E3", "#EECC1C"], highlight_category: string = "pep_class2"): AlignedPeptide[] {
    let result: AlignedPeptide[] = []
    let last_pep_end = [-1]
    const pep_margin = 2

    peptides.sort((a:Peptide, b:Peptide) => (a.position! === b.position!) ? b.length - a.length : a.position! - b.position!).forEach((pep, idx) => {
        let show_without_highlight = true

        // if highlighting variables other than peptide class, check how many to highlight in this peptide
        if (highlight_category !== 'pep_class2') {
            const to_highlight = [...new Set(pep.matching_spectra.map(spec => spec.sample[highlight_category]))] as string[]     // remove duplicates
            const colours = to_highlight.filter(category => group_names.includes(category)).map(category => group_colours[group_names.indexOf(category)+1])

            colours.forEach(colour => {
                // find the first free row
                let row = 0
                while ((row < last_pep_end.length) && (last_pep_end[row] >= pep.position!)) {
                    row += 1
                }

                result.push({
                    aa_pos: pep.position!,
                    length: pep.sequence.length,
                    colour: colour,
                    y_offset: row
                })

                // remember the length this row is now occupied for
                if (row < last_pep_end.length) {
                    last_pep_end[row] = pep.position! + pep.sequence.length + pep_margin
                } else {
                    last_pep_end.push(pep.position! + pep.sequence.length + pep_margin)
                }
            })

            show_without_highlight = to_highlight.filter(category => !group_names.includes(category)).length > 0
        }
        
        if (show_without_highlight) {
            // find the first free row
            let row = 0
            while ((row < last_pep_end.length) && (last_pep_end[row] >= pep.position!)) {
                row += 1
            }

            result.push({
                aa_pos: pep.position!,
                length: pep.sequence.length,
                colour: highlight_category === 'pep_class2' ? group_colours[group_names.indexOf(pep.class_2)] : group_colours[0],
                y_offset: row
            })

            // remember the length this row is now occupied for
            if (row < last_pep_end.length) {
                last_pep_end[row] = pep.position! + pep.sequence.length + pep_margin
            } else {
                last_pep_end.push(pep.position! + pep.sequence.length + pep_margin)
            }
        }
    })

    return result
}