import { writable, derived } from "svelte/store";
import type { Gene, Variant, Haplotype, Proteoform, Peptide, Transcript } from '../types/graph_nodes'
import type { Writable } from 'svelte/store';

export const geneSearchRequestPending: Writable<boolean> = writable(false)
export const proteoformSearchRequestPending: Writable<boolean> = writable(false)
export const geneOverview: Writable<Gene[]> = writable([])
export const geneFilter: Writable<[[number, number], [number, number]]> = writable([[-1, -1], [-1, -1]])
export const geneSearchResult: Writable<Gene[]> = writable([])
export const protHapSubrgaph: Writable<Proteoform[]> = writable([])
export const protRefSubrgaph: Writable<Proteoform[]> = writable([])
export const selectedGeneIdx: Writable<number> = writable(0);
export const selectedTranscriptIdx: Writable<number> = writable(-1);
export const selectedVariantIdx: Writable<number> = writable(-1);
export const selectedHaplotypeIdx: Writable<number> = writable(-1);
export const selectedHaplotypeGroupIdx: Writable<number> = writable(-1);
export const displayPSMs: Writable<boolean> = writable(false)
export const highlightVariable: Writable<string> = writable("pride_accession")
export const highlightValues: Writable<string[]> = writable([])
export const showSidebarOverview: Writable<boolean> = writable(true)
export const peptideHighlightFixed: Writable<[number, number]> = writable([-1, -1])

export const geneOverviewFiltered = derived([geneOverview, geneFilter], ([$geneOverview, $geneFilter]) => {
    const result =  $geneOverview.filter((g: Gene) => {
        return ((typeof(g._total_peptides) != "undefined") && (typeof(g._variant_peptides) != "undefined") && 
                (($geneFilter[0][0] == -1) || (g._total_peptides! >= $geneFilter[0][0])) && 
                (($geneFilter[1][0] == -1) || (g._total_peptides! <= $geneFilter[1][0])) && 
                (($geneFilter[0][1] == -1) || (g._variant_peptides! >= $geneFilter[0][1])) && 
                (($geneFilter[1][1] == -1) || (g._variant_peptides! <= $geneFilter[1][1])))
    })

    return result
})

export const selectedGene = derived([selectedGeneIdx, geneSearchResult], ([$selectedGeneIdx, $geneSearchResult]) => {
    if ($selectedGeneIdx !== -1) return $geneSearchResult[$selectedGeneIdx];
    else return undefined;
});

export const selectedTranscript = derived([selectedGene, selectedTranscriptIdx], ([$selectedGene, $selectedTranscriptIdx]) => {
    if ($selectedTranscriptIdx === -1) return undefined;
    else if (!$selectedGene) return undefined;    
    return $selectedGene.transcripts[$selectedTranscriptIdx];
});

export const selectedVariant = derived([selectedGene, selectedVariantIdx], ([$selectedGene, $selectedVariantIdx]) => {
    if ($selectedVariantIdx === -1) return undefined;
    else if (!$selectedGene) return undefined;
    return $selectedGene.variants[$selectedVariantIdx];
});

const formatHaplotype = (haplotype: Haplotype, refProteoform: Proteoform, transcript: Transcript, haplo_idx: number) => {
     // find the proteoform that is the result of this haplotype on the selected transcript
     const proteoform = transcript.proteoforms.find(prot => prot.haplotype === haplotype)

     if (!proteoform) {
         return;
     }

     let finalHaplotype: Haplotype = {
         id: haplotype.id,
         included_variants: haplotype.included_variants,
         matching_transcripts: haplotype.matching_transcripts,
         matching_proteoform: proteoform,
         frequency: transcript.transcript_hap_freqs[haplo_idx],
         UTR5_protein: [],
         UTR5_cDNA: [],
         UTR3_protein: [],
         UTR3_cDNA: [],
         coding_protein: [],
         coding_cDNA: [],
         alt_found_flag: [],
         synonymous_cDNA: []
     }

     // once we know the proteoform, we can filter out UTR and synonymous variants
     const allProteinChanges = proteoform.protein_changes.split(';')
     const allcDNAChanges = proteoform.cDNA_changes.split(';')
     const hasStopCodon = proteoform.sequence.includes('*', proteoform.start_aa)

     // consider the protein length either the length of the reference protein, or the length of the alternative protein if insertions are present
     // do not hide variants in coding regions if an early stop codon is introduced
     const protein_length = hasStopCodon ? 
         Math.max(proteoform.sequence.indexOf('*', proteoform.start_aa) - proteoform.start_aa, refProteoform.sequence.length) : 
         Math.max(proteoform.length - proteoform.start_aa, refProteoform.sequence.length)

     for (let i=0; i < allProteinChanges.length; i++) {
         const pos = Number.parseInt(allProteinChanges[i].split(':')[0])
         if (pos < 0) {
             // Is the variant in the 5'UTR?
             finalHaplotype.UTR5_cDNA!.push('c.' + allcDNAChanges[i])
             finalHaplotype.UTR5_protein!.push('p.' + allProteinChanges[i])
         } else if (pos > protein_length) {
             // Is the variant in the 3'UTR?
             finalHaplotype.UTR3_cDNA!.push('c.' + allcDNAChanges[i])
             finalHaplotype.UTR3_protein!.push('p.' + allProteinChanges[i])
         } else {
             // Is the variant non-synonymous?
             const REF = allProteinChanges[i].split(':')[1].split('>')[0]
             const ALT = allProteinChanges[i].split(':')[2].split('(')[0]
             if ((REF !== ALT) || (allProteinChanges[i].includes('+fs'))) {
                 finalHaplotype.coding_cDNA!.push('c.' + allcDNAChanges[i])
                 finalHaplotype.coding_protein!.push('p.' + allProteinChanges[i])
                 // Is there an overlapping variant peptide?
                 finalHaplotype.alt_found_flag!.push(finalHaplotype.included_variants[i].found)
             } else if (REF === ALT) {
                 finalHaplotype.synonymous_cDNA!.push('c.' + allcDNAChanges[i])
             }                    
         }
     }

    return finalHaplotype
}

export const availableHaplotypes = derived([selectedTranscript, selectedVariant], ([$selectedTranscript, $selectedVariant]) => {
    if (!$selectedTranscript) return []

    const refProteoform = $selectedTranscript.canonical_protein

    let result: Haplotype[] = []

    $selectedTranscript.haplotypes.forEach((haplotype, idx) => {
        // if we have selected a variant, show only the haplotypes that contain this variant
        if (!$selectedVariant || haplotype.included_variants.map((variant) => variant.id).includes($selectedVariant.id)) {
            const finalHaplotype = formatHaplotype(haplotype, refProteoform, $selectedTranscript, idx)

            if (finalHaplotype) {
                result.push(finalHaplotype)
            }
        }
    })

    return result.sort((a, b) => (b.frequency! - a.frequency!))
})

export const allHaplotypes = derived([selectedGene], ([$selectedGene]) => {
    if (!$selectedGene) return []

    let result: Haplotype[] = []

    $selectedGene.transcripts.forEach(transcript => {
        transcript.haplotypes.forEach((haplotype, idx) => {
            let finalHaplotype = formatHaplotype(haplotype, transcript.canonical_protein, transcript, idx)

            if (finalHaplotype) {
                finalHaplotype.matching_transcripts = [transcript]
                result.push(finalHaplotype)
            }
        })
    })

    return result.sort((a, b) => (b.frequency! - a.frequency!))
})

interface AvailableVariants {
    variants: Variant[],
    ids: string[]
}

export const availableVariants = derived([selectedGene, availableHaplotypes], ([$selectedGene, $availableHaplotypes]) => {
    let result: AvailableVariants = {
        variants: [],
        ids: []
    }

    $availableHaplotypes.forEach((haplotype) => {
        haplotype.included_variants.forEach((variant) => {
            if (!result.ids.includes(variant.id)) {
                result.variants.push(variant)
                result.ids.push(variant.id)
            }
        })
    })

    return result
})

export const selectedHaplotype = derived([availableHaplotypes, selectedHaplotypeIdx], ([$availableHaplotypes, $selectedHaplotypeIdx]) => {
    if (!$availableHaplotypes || ($selectedHaplotypeIdx === -1)) return undefined
    return $availableHaplotypes[$selectedHaplotypeIdx]
})

export const selectedProteoform = derived([selectedHaplotype, selectedTranscript], ([$selectedHaplotype, $selectedTranscript]) => {
    if (!$selectedTranscript || !$selectedHaplotype) return undefined
    return $selectedTranscript.proteoforms.find(prot => (prot.haplotype) && (prot.haplotype.id === $selectedHaplotype.id))
})

export const storeSelection1 = derived([selectedGene, selectedTranscript, selectedVariant, availableHaplotypes, selectedHaplotype], ([$selectedGene, $selectedTranscript, $selectedVariant, $availableHaplotypes, $selectedHaplotype]) => {
    return {
        gene: $selectedGene,
        transcript: $selectedTranscript,
        variant: $selectedVariant,
        availableHaplotypes: $availableHaplotypes,
        haplotype: $selectedHaplotype
    }
})

export const refAltProteoform = derived([protRefSubrgaph, protHapSubrgaph], ([$protRefSubrgaph, $protHapSubrgaph]) => {
    return {
        ref: $protRefSubrgaph,
        alt: $protHapSubrgaph
    }
})

interface FilteredPeptides {
    ref: Peptide[],
    alt: Peptide[],
    display_PSMs: boolean
}

export const filteredPeptides = derived([refAltProteoform, displayPSMs], ([$refAltProteoform, $display_PSMs]) => {
    let allPeptides: FilteredPeptides = {ref: [], alt: [], display_PSMs: $display_PSMs}

    if ($refAltProteoform.ref && ($refAltProteoform.ref.length > 0)) {
        $refAltProteoform.ref[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
            pept.position = $refAltProteoform.ref[0].matching_peptide_positions![idx]
            allPeptides.ref.push(pept)
        });
    }
    if ($refAltProteoform.alt && ($refAltProteoform.alt.length > 0)) {
        $refAltProteoform.alt[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
            pept.position = $refAltProteoform.alt[0].matching_peptide_positions![idx] - $refAltProteoform.alt[0].start_aa
            allPeptides.alt.push(pept)
        });
    }

    allPeptides.ref.sort((a: Peptide, b: Peptide) => a.position! - b.position!)
    allPeptides.alt.sort((a: Peptide, b: Peptide) => a.position! - b.position!)

    return allPeptides
})

interface PSMData {
    peptides: FilteredPeptides,
    highlight_by: string,
    highlight_values: string[]
}

export const PSMDisplayData = derived([filteredPeptides, highlightVariable, highlightValues], ([$filteredPeptides, $highlightVariable, $highlightValues]) => {
    return {
        peptides: $filteredPeptides,
        highlight_by: $highlightVariable,
        highlight_values: $highlightValues
    } as PSMData
})