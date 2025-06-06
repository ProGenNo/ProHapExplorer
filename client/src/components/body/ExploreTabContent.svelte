<script lang='ts'>
  import  CloseOutline from 'flowbite-svelte-icons/CloseOutline.svelte'
  import { Button } from "flowbite-svelte";
  import { activeTabIdx, allHaplotypes, displayPSMs, protHapSubrgaph, selectedGene, selectedGeneIdx, selectedHaplotypeGroupIdx, selectedHaplotypeIdx, selectedTranscriptIdx, selectedVariant, selectedVariantIdx } from "../../stores/stores";
  import Dropdown from "../basic/Dropdown.svelte";
  import PeptideTable from "./PeptideTable.svelte";
  import SplicingVariationSelector from "./SplicingVariationSelector.svelte";
  import PsmAlignmentChart from "./PSMAlignmentChart.svelte";
  import { onMount, onDestroy } from "svelte";
  import DropdownSimple from '../basic/DropdownSimple.svelte';
  //import type { Proteoform } from "../../types/graph_nodes";

  export let tabIdx: number;
  export let handleTabClose : (event: MouseEvent) => void;

  // What coordinate system to show on the X axis
  let x_coord = $selectedGene ? "Chrom. " + $selectedGene.chrom : ""

  onMount(() => {
    //console.log('Mounting tab ' + tabIdx)
    activeTabIdx.set(tabIdx)
  })

  // Handle the toggle between abbreviated and full sequence view
  /*const step2_options = [
    { id: 1, text: `Abbreviated` },
    { id: 2, text: `Full` }
  ]  
  let step2_option = step2_options[0].id;
  async function handleViewToggle() {
    
  }*/

  // Handle the toggle between peptide and PSM view
  const step3_options = [
    { id: 1, text: `Peptides` },
    { id: 2, text: `PSMs` }
  ]  
  let step3_option = step3_options[0].id;
  let step3_show_UTR = true
  
  function handleViewToggle(event: Event) {
    displayPSMs.set((step3_option === 2))
  }

  const unsubscribe = displayPSMs.subscribe(data => {
    step3_option = data ? 2 : 1
  })

  const handleVariantDeselect = () => {
      selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), -1, ...$selectedVariantIdx.slice($activeTabIdx+1)])
      selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
      selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
      protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
  }

  const handleVariantSelect = (event: MouseEvent) => {
      const variantIdx = $selectedGene!.variants.findIndex((variant) => variant.id === (event.target as HTMLElement).id.split("menuItem_")[1])      
      selectedVariantIdx.set([...$selectedVariantIdx.slice(0, $activeTabIdx), variantIdx, ...$selectedVariantIdx.slice($activeTabIdx+1)])
      selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
      selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
      protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
  }

  const handleAxisSelect = (event: MouseEvent) => {
    x_coord = (event.target as HTMLElement).id.split("menuItem_")[1]
  }

  const handleDownloadAllFasta = () => {
    let download_text = ""
    $selectedGene!.transcripts.forEach(transcript => {
      transcript.proteoforms.forEach(prot => {
        download_text += '>' + prot.id + ' GN=' + (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name) + ' TR=' + transcript.id + ' start_aa:' + prot.start_aa + '\n'
        download_text += prot.sequence + '\n'
      })
    })

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(download_text));
    element.setAttribute('download', (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name) + '_all_sequences.fasta');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const handleDownloadFilteredFasta = () => {
    let download_text = ""
    $selectedGene!.transcripts.forEach(transcript => {
      transcript.proteoforms.forEach(prot => {
        download_text += '>' + prot.id + ' GN=' + (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name) + ' TR=' + transcript.id + '\n'
        const stop_loc = prot.sequence.indexOf('*', prot.start_aa)
        download_text += prot.sequence.slice(prot.start_aa, (stop_loc !== -1) ? stop_loc : prot.sequence.length) + '\n'
      })
    })

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(download_text));
    element.setAttribute('download', (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name) + '_sequences_noUTR.fasta');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  const handleDownloadHaploTable = () => {
    let download_text = [
      'HaplotypeID', 'gene_name', 'gene_id', 'transcript_id', 
      'all_protein_changes', 'all_cdna_changes', 'coding_protein_changes', '5UTR_cDNA_changes', '3UTR_cDNA_changes', 'synonymous_cDNA_changes', 
      '1000_genomes_frequency'].join('\t') + '\n'
    
    $allHaplotypes!.forEach(haplotype => {
      const all_changes = [...haplotype.UTR5_protein!, ...haplotype.coding_protein!, ...haplotype.UTR3_protein!]
      const all_cDNA = [...haplotype.UTR5_cDNA!, ...haplotype.coding_cDNA!, ...haplotype.UTR3_cDNA!]

      download_text += [
        haplotype.id,
        (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name),
        $selectedGene!.id,
        haplotype.matching_transcripts[0].id,
        all_changes.join(';'),
        all_cDNA.join(';'),
        haplotype.coding_protein!.join(';'),
        haplotype.UTR5_cDNA!.join(';'),
        haplotype.UTR3_cDNA!.join(';'),
        haplotype.synonymous_cDNA!.join(';'),
        haplotype.frequency?.toFixed(6)
      ].join('\t') + '\n'
    })

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(download_text));
    element.setAttribute('download', (($selectedGene!.gene_name == '-') ? $selectedGene!.id : $selectedGene!.gene_name) + '_haplotypes.tsv');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  onDestroy(unsubscribe)
</script>

<style>
  .body-header {
    @apply flex gap-12 items-center mb-2;
  }
  .gene-name {
    @apply text-3xl font-semibold;
  }
  .body {
    @apply h-fit mb-4;
	} 
  .step1-header {
    display: grid;
    grid-template-columns: 70% 15% 15%;
    @apply mt-2 mr-2;
  }
  /*.step2-header {
    @apply flex gap-20 mt-2 items-baseline;
  }*/
</style>

{#if $selectedGene}
    <Button id={"btn-close-" + tabIdx} color="alternative" on:click={handleTabClose}>
        <div id={"div-close-" + tabIdx} class='flex gap-1 items-center'>
            <CloseOutline id={"icon-close-" + tabIdx} />
            <span id={"span-close-" + tabIdx}>Close tab</span>
        </div>
    </Button>
    <div class="body-header">
        <div class="gene-name">{$selectedGene.gene_name != '-' ? $selectedGene.gene_name : $selectedGene.id}</div> 
        <div class="">gene - {$selectedGene.gene_biotype.replace('_', ' ')}</div>
        <div class="grow">Chromosome {$selectedGene.chrom}: {$selectedGene.bp_from.toLocaleString('en-US', {minimumFractionDigits: 0})} - {$selectedGene.bp_to.toLocaleString('en-US', {minimumFractionDigits: 0})}   {($selectedGene.strand == '+' ? "forward strand" : "reverse strand")}</div>
        <div class='grid grid-cols-1'>
        <div><button on:click={handleDownloadAllFasta}>Download all sequences</button></div>
        <div><button on:click={handleDownloadFilteredFasta}>Download mORF translations</button></div>
        </div>
        <div>
        <button on:click={handleDownloadHaploTable}>Download haplotype details</button>
        </div>
    </div>
    <hr />

    <div class='header step1-header'>
    <div>
        <h3 class="">1. Splicing and variation</h3>
        <div class='mt-1 ml-2'>
        <p>First, select a transcript by clicking on the respective transcript ID. Filter haplotypes by selecting a variant, or browse all haplotypes directly in the table below.</p>
        </div>        
    </div>
    <div>
        <p class="mb-1">Filter by variant:</p>
        <Dropdown allItems={$selectedGene ? $selectedGene.variants.map((v) => v.id) : []} 
                handleClear={handleVariantDeselect} 
                handleSelect={handleVariantSelect}  
                isDisabled={$selectedTranscriptIdx[tabIdx] === -1}
                selectedItem={$selectedVariant ? $selectedVariant.id : undefined}
        />
    </div>
    <div>
        <p class="mb-1">X axis:</p>
        <DropdownSimple allItems={$selectedGene ? (($selectedTranscriptIdx[tabIdx] !== -1) ? ['Chrom. ' + $selectedGene.chrom, 'Transcript', 'Protein'] : ['Chrom. ' + $selectedGene.chrom]) : []} 
                handleSelect={handleAxisSelect}  
                isDisabled={false}
                selectedItem={$selectedGene ? x_coord : undefined}
        />
    </div>
  </div>
  <div class="body">
    <SplicingVariationSelector x_coord_system={x_coord} />
  </div>
  <hr />
  { #if ($selectedTranscriptIdx[tabIdx] > -1)}
    <!--
    <div class='header step2-header'>
    <h3>2. Overview of the protein sequence</h3>
    <div class='flex gap-2 items-baseline'>
        <span>Display:&emsp;</span>      
        <form on:submit|preventDefault="{() => {}}" id="step2_toggle" class="nobr">
        <select bind:value="{step2_option}">
            {#each step2_options as option}
            <option value={option.id}>
                {option.text}
            </option>
            {/each}
        </form>
    </div>
    </div>
    <div class="body">
    {#if $selectedHaplotypeIdx > -1}
        {#if step2_option === 1}
        <SequenceAnalysisAbbreviated />
        {/if}
        {#if step2_option === 2}
        <SequenceAnalysisFull />
        {/if}
    {:else}
        <h5>Select a haplotype to view sequence</h5>
    {/if}
    </div>
    <hr />
    -->
    <div class='header mt-2 flex gap-2 items-baseline'>
    <div class="grow">
        <h3>2. Coverage by identified peptides</h3>              
        <div class='mt-1 ml-2'>
        <p>Click on plot elements to highlight peptides below.</p>
        </div>    
    </div>      
    <div class="flex mr-5 items-center shrink">
        <input type="checkbox" id="step3_show_UTR" name="step3_show_UTR" value="step3_show_UTR" on:click={() => {step3_show_UTR = !step3_show_UTR}} checked={!step3_show_UTR}>
        <label class="ml-2" for="step3_show_UTR"> Hide untraslated regions (UTRs)</label>
    </div>
    <div class="flex shrink">
        <span>Display:&emsp;</span>     
    </div>
    <div class="flex mr-5"> 
        <form id="step2_toggle" class="nobr">
        <select bind:value="{step3_option}" on:change="{(evt) => {handleViewToggle(evt)}}">
            {#each step3_options as option}
            <option value={option.id}>
                {option.text}
            </option>
            {/each}
        </form>
    </div>
    </div>
    <div class="body">
    <PsmAlignmentChart show_UTR={step3_show_UTR} />
    <PeptideTable />
    </div>
  {/if}        
{/if}