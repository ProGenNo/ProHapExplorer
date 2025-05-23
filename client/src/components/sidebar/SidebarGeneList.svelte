<script lang="ts">
    //import { onDestroy } from "svelte";
    //import type { Gene, Transcript } from '../../types/graph_nodes'
    import { genesInTabs, activeTabIdx, geneSearchResult, selectedGeneIdx, selectedTranscriptIdx, protHapSubrgaph, protRefSubrgaph, selectedVariantIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, peptideHighlightFixed } from "../../stores/stores"

    function geneClicked(this: HTMLDivElement, evt: any) {
        const clickedId = parseInt(this.id.split('_')[2]);

        selectedGeneIdx.set([...$selectedGeneIdx.slice(0, $activeTabIdx), clickedId, ...$selectedGeneIdx.slice($activeTabIdx+1)])
        
        protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
        protRefSubrgaph.set([...$protRefSubrgaph.slice(0, $activeTabIdx), [], ...$protRefSubrgaph.slice($activeTabIdx+1)])
        selectedTranscriptIdx.set([...$selectedTranscriptIdx.slice(0, $activeTabIdx), -1, ...$selectedTranscriptIdx.slice($activeTabIdx+1)])
        selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), -1, ...$selectedVariantIdx.slice($activeTabIdx+1)])
        selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
        selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
        peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
    }
</script>

<style>
    #gene-table {
        /*background-color: bisque;*/
        display: grid;
        grid-template-columns: 1fr 2fr 1fr 2fr;
        @apply gap-3 ml-2 mt-3 content-start overflow-scroll;
    }
    .text-small {
        @apply text-sm overflow-hidden;
    }
    .selected {
        @apply font-bold;
    }
</style>

<div id="gene-table" class="hidescrollbar">
    <div class="font-semibold self-baseline">Gene</div>
    <div class="font-semibold text-sm self-baseline">Ensembl ID</div>
    <div class="font-semibold text-sm self-baseline">Chromosome</div>
    <div class="font-semibold text-sm self-baseline">Variants</div>
    { #each $genesInTabs[$activeTabIdx] as geneIdx}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <h4 id={'gene_name_' + geneIdx.toString()} class={"font-semibold self-baseline hover:font-bold cursor-pointer" + ($selectedGeneIdx[$activeTabIdx] === geneIdx ? " selected" : "")} on:click={geneClicked}>{$geneSearchResult[geneIdx].gene_name}</h4>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div id={'gene_id_' + geneIdx.toString()} class={"text-sm self-baseline hover:font-bold cursor-pointer" + ($selectedGeneIdx[$activeTabIdx] === geneIdx ? " selected" : "")} on:click={geneClicked}>{$geneSearchResult[geneIdx].id}</div>
        <div class={"self-baseline" + ($geneSearchResult[geneIdx].chrom.length > 2 ? " text-small" : "") + ($selectedGeneIdx[$activeTabIdx] === geneIdx ? " selected" : "")}>{$geneSearchResult[geneIdx].chrom}</div>
        <div class={"self-baseline"  + ($selectedGeneIdx[$activeTabIdx] === geneIdx ? " selected" : "")}>{$geneSearchResult[geneIdx].variants.length}</div>
    { /each }
</div>