import { activeTabIdx, displayPSMs, geneSearchResult, genesInTabs, highlightValues, highlightVariable, peptideHighlightFixed, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeGroupIdx, selectedHaplotypeIdx, selectedTranscriptIdx, selectedVariantIdx, showSidebarOverview } from "./stores"

export function resetContents(): void {
    showSidebarOverview.set(true)
    genesInTabs.set([])
    activeTabIdx.set(0)
    geneSearchResult.set([])
    selectedTranscriptIdx.set([])
    selectedVariantIdx.set([])
    selectedHaplotypeIdx.set([])
    selectedHaplotypeGroupIdx.set([])
    selectedGeneIdx.set([])
    protHapSubrgaph.set([[]])
    protRefSubrgaph.set([[]])
    displayPSMs.set(false)
    peptideHighlightFixed.set([])
    highlightVariable.set("pride_accession")
    highlightValues.set([])
}