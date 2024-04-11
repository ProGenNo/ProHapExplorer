<script lang="ts">
    import { onDestroy } from "svelte";
    import type { Gene, Transcript } from '../types/graph_nodes'
    import { geneSearchResult, selectedGeneIdx, selectedTranscriptIdx, protHapSubrgaph, protRefSubrgaph, selectedVariantIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx } from "../stores/stores"

    function geneClicked(this: HTMLDivElement, evt: any) {
        const clickedId = parseInt(this.id.split('_')[2]);

        selectedGeneIdx.set(clickedId);
        
        protHapSubrgaph.set([])
        protRefSubrgaph.set([])
        selectedTranscriptIdx.set(-1)
        selectedVariantIdx.set(-1)
        selectedHaplotypeIdx.set(-1)
        selectedHaplotypeGroupIdx.set(-1)
    }
</script>

<style>
    #gene-table {
        display: grid;
        grid-template-columns: 1fr 2fr 2fr 2fr;
        @apply gap-3 ml-2 mt-3 content-start;
    }
    .text-small {
        @apply text-sm;
    }
    .selected {
        @apply font-bold;
    }
</style>

<div id="gene-table">
    <div class="font-semibold self-baseline">Gene</div>
    <div class="font-semibold text-sm self-baseline">Ensembl ID</div>
    <div class="font-semibold text-sm self-baseline">Chromosome</div>
    <div class="font-semibold text-sm self-baseline">Variants</div>
    { #each $geneSearchResult as gene, idx }
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <h4 id={'gene_name_' + idx.toString()} class={"font-semibold self-baseline hover:font-bold cursor-pointer" + ($selectedGeneIdx === idx ? " selected" : "")} on:click={geneClicked}>{gene.gene_name}</h4>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div id={'gene_id_' + idx.toString()} class={"text-sm self-baseline hover:font-bold cursor-pointer" + ($selectedGeneIdx === idx ? " selected" : "")} on:click={geneClicked}>{gene.id}</div>
        <div class={"self-baseline" + (gene.chrom.length > 2 ? " text-small" : "") + ($selectedGeneIdx === idx ? " selected" : "")}>{gene.chrom}</div>
        <div class={"self-baseline"  + ($selectedGeneIdx === idx ? " selected" : "")}>{gene.variants.length}</div>
    { /each }
</div>