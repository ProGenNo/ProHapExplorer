<script lang="ts">    
    import { onDestroy } from 'svelte';
    import { filteredPeptides, selectedGene, selectedTranscript } from '../../stores/stores'
    import type { Peptide } from '../../types/graph_nodes.js';
    import { mean } from 'd3';
    import DensityPlot from '../basic/DensityPlot.svelte';
    import JitterPlot from '../basic/JitterPlot.svelte';

    let allPeptides: Peptide[] = []

    // index of the best, median, and worst PSM by PEP for each peptide
    //let best_idx: number[] = []
    //let median_idx: number[] = []
    //let worst_idx: number[] = []

    const unsubscribe = filteredPeptides.subscribe(filteredPeptides => {
        allPeptides = [...filteredPeptides.ref, ...filteredPeptides.alt!.filter((pept) => (pept.class_1 != 'canonical'))]
        allPeptides.sort((a: Peptide, b: Peptide) => a.position! - b.position!)
    })

    onDestroy(unsubscribe)

    const handleDownloadClick = () => {
        let download_text = ['sequence', 'gene_name', 'gene_id', 'transcript_id', 'pep_type1', 'pep_type2', 'posterior_error_prob', 'USI'].join('\t') + '\n'
        allPeptides.forEach(pept => {
            for(let i=0; i < pept.PSM_PEP.length; i++) {
                download_text += [
                    pept.sequence, 
                    $selectedGene!.gene_name, 
                    $selectedGene!.id, 
                    $selectedTranscript!.id, 
                    pept.class_1,
                    pept.class_2,
                    pept.PSM_PEP[i].toFixed(10),
                    pept.matching_spectra[i].USI.replace('.mzXML', '')
                ].join('\t') + '\n'
            }
        })

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(download_text));
        element.setAttribute('download', $selectedGene!.gene_name + '_' + $selectedTranscript!.id + '_peptides.tsv');

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
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
    
    #peptide-table-wrapper {
        max-height: 25vh;
    }

    .pep-density {
        width: 100%;
        height: 5rem;
    }
</style>

<div class='flex gap-2 items-baseline'>
    <div class='flex grow'>
        <h5>Identified peptides:</h5>
    </div>
    <div class='flex shrink mr-3'>
        <button on:click={handleDownloadClick}>Download data</button>
    </div>
</div>
<div id='peptide-table-wrapper' class="mt-3 ml-7 overflow-scroll">
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
                    { #if (peptide.PSM_PEP.length > 15)}
                        <DensityPlot data={peptide.PSM_PEP.map(pep => (-1 * Math.log10(pep)))} x_label="-log(PEP)" x_max={10}/>
                    { :else }
                        <JitterPlot data={peptide.PSM_PEP.map(pep => (-1 * Math.log10(pep)))} x_label="-log(PEP)" x_max={10}/>
                    {/if}
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
</div>