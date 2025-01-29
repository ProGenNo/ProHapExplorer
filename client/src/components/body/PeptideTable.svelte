<script lang="ts">    
    import { onMount, onDestroy } from 'svelte';
    import { filteredPeptides } from '../../stores/stores'
    import type { Peptide, Spectrum } from '../../types/graph_nodes.js';
    import { max, mean, median, min } from 'd3';
  import DensityPlot from '../basic/DensityPlot.svelte';

    let allPeptides: Peptide[] = []

    // index of the best, median, and worst PSM by PEP for each peptide
    let best_idx: number[] = []
    let median_idx: number[] = []
    let worst_idx: number[] = []

    const unsubscribe = filteredPeptides.subscribe(filteredPeptides => {
        allPeptides = [...filteredPeptides.ref, ...filteredPeptides.alt!.filter((pept) => (pept.class_1 != 'canonical'))]
        allPeptides.sort((a: Peptide, b: Peptide) => a.position! - b.position!)


    })

    onDestroy(unsubscribe)
</script>

<style>
    #peptide-table {
        overflow-x: scroll;
        max-width: 100%;
        display: grid;
        grid-template-columns: 2fr 1fr repeat(6, 2fr);
        column-gap: 7px;
        align-items: flex-start;
    }

    .pep-density {
        width: 100%;
        height: 5rem;
    }
</style>

{#if (allPeptides.length > 0)}
    <div id='peptide-table'>
        <div class="font-semibold self-baseline">Sequence</div>
        <div class="font-semibold self-baseline">Position</div>
        <div class="font-semibold self-baseline">Peptide Type</div>
        <div class="font-semibold self-baseline">Peptide Class</div>
        <div class="font-semibold self-baseline">Count of spectra</div>
        <div class="font-semibold self-baseline">Posterior error prob.</div>
        <div class="font-semibold self-baseline">Average RT</div>        
        <div class="font-semibold self-baseline">USI</div>
        { #each allPeptides as peptide }
            <div class="col-span-full mt-1 mb-1"><hr/></div>
            <div class="self-baseline">{peptide.sequence}</div>
            <div class="self-baseline">{peptide.position}</div>
            <div class="self-baseline">{peptide.class_1}</div>
            <div class="self-baseline">{peptide.class_2}</div>
            <div class="self-baseline">{peptide.matching_spectra.length}</div>
            <div class="self-start pep-density">
                <!-- {peptide.PSM_PEP[0].toFixed(6)} 
                {peptide.PSM_PEP[Math.floor(peptide.PSM_PEP.length / 2)].toFixed(6)} 
                {peptide.PSM_PEP[peptide.PSM_PEP.length-1].toFixed(6)} -->
                <DensityPlot data={peptide.PSM_PEP.map(pep => (-1 * Math.log10(pep)))} x_label="-log(PEP)" x_max={10}/>
            </div>
            <div class="self-start">{mean(peptide.matching_spectra.map(spec => spec.retention_time))}</div>
            <div class="self-start">
                <div><a href={"https://www.ebi.ac.uk/pride/archive/usi?usi=" + peptide.matching_spectra[0].USI.replace('.mzXML', '').replace('+', '%2b') + "&resultType=FULL"} target="_blank" rel="noopener noreferrer">Best PSM</a></div>
                {#if peptide.matching_spectra.length > 1}
                    <div><a href={"https://www.ebi.ac.uk/pride/archive/usi?usi=" + peptide.matching_spectra[0].USI.replace('.mzXML', '').replace('+', '%2b') + "&resultType=FULL"} target="_blank" rel="noopener noreferrer">Second best PSM</a></div>
                {/if}
                {#if peptide.matching_spectra.length > 5}
                    <div><a href={"https://www.ebi.ac.uk/pride/archive/usi?usi=" + peptide.matching_spectra[Math.floor(peptide.matching_spectra.length / 2)].USI.replace('.mzXML', '').replace('+', '%2b') + "&resultType=FULL"} target="_blank" rel="noopener noreferrer">Median PSM</a></div>
                {/if}
            </div>
        { /each }   
    </div>
{:else}
    <h5>There are no matching peptides to this protein.</h5>
{/if}