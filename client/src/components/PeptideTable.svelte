<script lang="ts">    
    import { onMount, onDestroy } from 'svelte';
    import { refAltProteoform } from '../stores/stores'
    import type { Peptide, Spectrum } from '../types/graph_nodes.js';
  import { max, mean, median, min } from 'd3';

    let allPeptides: Peptide[] = []

    const unsubscribe = refAltProteoform.subscribe(refAltProteoform => {
        allPeptides = []

        if (refAltProteoform.ref && (refAltProteoform.ref.length > 0)) {
            refAltProteoform.ref[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
                pept.position = refAltProteoform.ref[0].matching_peptide_positions![idx]
                allPeptides.push(pept)
            });
        }
        if (refAltProteoform.alt && (refAltProteoform.alt.length > 0)) {
            refAltProteoform.alt[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
                if (pept.class_1 !== 'canonical') {
                    pept.position = refAltProteoform.alt[0].matching_peptide_positions![idx]
                    allPeptides.push(pept)
                }
            });
        }

        allPeptides.sort((a: Peptide, b: Peptide) => a.position! - b.position!)
    })

    onDestroy(unsubscribe)
</script>

<style>
    #peptide-table {
        overflow-x: scroll;
        max-width: 100%;
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        column-gap: 7px;
    }
</style>

{#if (allPeptides.length > 0)}
    <div id='peptide-table'>
        <div class="font-semibold self-baseline">Sequence</div>
        <div class="font-semibold self-baseline">Position</div>
        <div class="font-semibold self-baseline">Peptide Type</div>
        <div class="font-semibold self-baseline">Peptide Class</div>
        <div class="font-semibold self-baseline">Count of matching spectra</div>
        <div class="font-semibold self-baseline">PEP (min,median,max)</div>
        <div class="font-semibold self-baseline">Average RT</div>
        { #each allPeptides as peptide }
            <div class="self-baseline">{peptide.sequence}</div>
            <div class="self-baseline">{peptide.position}</div>
            <div class="self-baseline">{peptide.class_1}</div>
            <div class="self-baseline">{peptide.class_2}</div>
            <div class="self-baseline">{peptide.matching_spectra.length}</div>
            <div class="self-baseline">{min(peptide.PSM_PEP)} {median(peptide.PSM_PEP)} {max(peptide.PSM_PEP)}</div>
            <div class="self-baseline">{mean(peptide.matching_spectra.map(spec => spec.retention_time))}</div>
        { /each }   
    </div>
{:else}
    <h5>There are no matching peptides to this protein.</h5>
{/if}