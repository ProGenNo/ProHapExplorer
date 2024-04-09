import { writable, derived } from "svelte/store";
import type { Gene, Variant, Haplotype, Proteoform } from '../types/graph_nodes'
import type { Writable } from 'svelte/store';

export const geneSearchResult: Writable<Gene[]> = writable([])
export const protHapSubrgaph: Writable<Proteoform[]> = writable([])
export const protRefSubrgaph: Writable<Proteoform[]> = writable([])
export const selectedGeneIdx: Writable<number> = writable(0);
export const selectedTranscriptIdx: Writable<number> = writable(-1);
export const selectedVariantIdx: Writable<number> = writable(-1);
export const selectedHaplotypeIdx: Writable<number> = writable(-1);
export const selectedHaplotypeGroupIdx: Writable<number> = writable(-1);

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

export const availableHaplotypes = derived([selectedTranscript, selectedVariant], ([$selectedTranscript, $selectedVariant]) => {
    if (!$selectedTranscript) return []

    let result: Haplotype[] = []
    $selectedTranscript.haplotypes.forEach((haplotype, idx) => {
        // if we have selected a variant, show only the haplotypes that contain this variant
        if (!$selectedVariant || haplotype.included_variants.map((variant) => variant.id).includes($selectedVariant.id)) {
            // find the proteoform that is the result of this haplotype on the selected transcript
            const proteoform = $selectedTranscript.proteoforms.find(prot => prot.haplotype === haplotype)

            if (!proteoform) {
                return;
            }

            let finalHaplotype: Haplotype = {
                id: haplotype.id,
                included_variants: haplotype.included_variants,
                matching_transcripts: haplotype.matching_transcripts,
                matching_proteoform: proteoform,
                frequency: $selectedTranscript.transcript_hap_freqs[idx],
                UTR5_protein: [],
                UTR5_cDNA: [],
                UTR3_protein: [],
                UTR3_cDNA: [],
                coding_protein: [],
                coding_cDNA: [],
                synonymous_cDNA: []
            }

            // once we know the proteoform, we can filter out UTR and synonymous variants
            const allProteinChanges = proteoform.protein_changes.split(';')
            const allcDNAChanges = proteoform.cDNA_changes.split(';')
            const hasStopCodon = proteoform.sequence.includes('*', proteoform.start_aa)
            const protein_length = hasStopCodon ? proteoform.sequence.indexOf('*', proteoform.start_aa) - proteoform.start_aa : proteoform.length - proteoform.start_aa

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
                    } else if (REF === ALT) {
                        finalHaplotype.synonymous_cDNA!.push('c.' + allcDNAChanges[i])
                    }
                }
            }

            result.push(finalHaplotype)
        }
    })

    return result.sort((a, b) => (b.frequency! - a.frequency!))
})

export const availableVariants = derived([selectedGene, availableHaplotypes], ([$selectedGene, $availableHaplotypes]) => {
    let result: Variant[] = [], ids: string[] = []

    $availableHaplotypes.forEach((haplotype) => {
        haplotype.included_variants.forEach((variant) => {
            if (!ids.includes(variant.id)) {
                result.push(variant)
                ids.push(variant.id)
            }
        })
    })

    return [ result, ids ]
})

export const selectedHaplotype = derived([availableHaplotypes, selectedHaplotypeIdx], ([$availableHaplotypes, $selectedHaplotypeIdx]) => {
    if (!$availableHaplotypes || ($selectedHaplotypeIdx === -1)) return undefined
    return $availableHaplotypes[$selectedHaplotypeIdx]
})

export const selectedProteoform = derived([selectedHaplotype, selectedTranscript], ([$selectedHaplotype, $selectedTranscript]) => {
    if (!$selectedTranscript || !$selectedHaplotype) return undefined
    return $selectedTranscript.proteoforms.find(prot => prot.haplotype.id === $selectedHaplotype.id)
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