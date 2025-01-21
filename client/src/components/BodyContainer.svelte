<script lang="ts">
  import { geneSearchRequestPending, selectedGene, selectedVariant, selectedVariantIdx, selectedTranscriptIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, protHapSubrgaph, geneOverview, displayPSMs } from "../stores/stores"
  import Dropdown from "./basic/Dropdown.svelte";
  import SplicingVariationSelector from './body/SplicingVariationSelector.svelte';
  //import SequenceAnalysisAbbreviated from './body/SequenceAnalysisAbbreviated.svelte';
  //import SequenceAnalysisFull from './body/SequenceAnalysisFull.svelte';
  import PSMAlignmentChart from './body/PSMAlignmentChart.svelte';
  import PeptideTable from "./body/PeptideTable.svelte";
  import { onDestroy } from "svelte";
  import { Tabs, TabItem } from 'flowbite-svelte';
  import HomePageOverview from "./body/HomePage_overview.svelte";
  import Histogram2D from "./body/Histogram2D.svelte";

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
      selectedVariantIdx.set(-1)
      selectedHaplotypeIdx.set(-1)
      selectedHaplotypeGroupIdx.set(-1)
      protHapSubrgaph.set([])
  }

  const handleVariantSelect = (event: MouseEvent) => {
      const variantIdx = $selectedGene!.variants.findIndex((variant) => variant.id === (event.target as HTMLElement).id.split("menuItem_")[1])
      selectedVariantIdx.set(variantIdx)
      selectedHaplotypeIdx.set(-1)
      selectedHaplotypeGroupIdx.set(-1)
      protHapSubrgaph.set([])
  }

  onDestroy(unsubscribe)

</script>

<style>
  /*.align-right {
    float: right;
    margin-right: 10vw;
  }*/
  .body-header {
    @apply flex gap-12 items-center mb-5;
  }
  .gene-name {
    @apply text-3xl font-semibold;
  }
  .step1-header {
    display: grid;
    grid-template-columns: 80% 20%;
    @apply mt-2 mr-2;
  }
  .step2-header {
    @apply flex gap-20 mt-2 items-baseline;
  }
  :global(.accordion-item) {
		border-bottom: 1px solid rgb(110, 110, 110);
	} 
  .body {
    @apply h-fit mb-4;
	}
  #peptide-table {
    @apply mt-3 ml-7 overflow-scroll; 
    max-height: 25vh;
  }
  #overview-table {
    width: 35vw;
    margin-right: 2;
  }
  #overview-2d-histo {
    width: 30vw;
  }
</style>

<div class="{$$props.class}">
  {#if $geneSearchRequestPending}
    <h4>Loading data...</h4>
  {:else if $selectedGene}
    <div class="body-header">
        <div class="gene-name">{$selectedGene.gene_name != '-' ? $selectedGene.gene_name : $selectedGene.id}</div> 
        <div class="">gene - {$selectedGene.gene_biotype.replace('_', ' ')}</div>
        <div class="">Chromosome {$selectedGene.chrom}: {$selectedGene.bp_from.toLocaleString('en-US', {minimumFractionDigits: 0})} - {$selectedGene.bp_to.toLocaleString('en-US', {minimumFractionDigits: 0})}   {($selectedGene.strand == '+' ? "forward strand" : "reverse strand")}</div>
    </div>
    <hr />

    <div class='header step1-header'>
      <div>
        <h3 class="">1. Splicing and variation</h3>        
        <p>&emsp;(select by interacting with the figure, or from the table below)</p>
      </div>
      <div>
        <p class="mb-1">Filter by variant:</p>
        <Dropdown allItems={$selectedGene ? $selectedGene.variants.map((v) => v.id) : []} 
                  handleClear={handleVariantDeselect} 
                  handleSelect={handleVariantSelect}  
                  isDisabled={$selectedTranscriptIdx === -1}
                  selectedItem={$selectedVariant ? $selectedVariant.id : undefined}
        />
      </div>
    </div>
    <div class="body">
      <SplicingVariationSelector />
    </div>
    <hr />
    { #if ($selectedTranscriptIdx > -1)}
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
      <div class="flex grow">
        <h3>2. Coverage by mass spectra</h3>
      </div>      
      <div class="flex mr-5 items-center shrink">
        <input type="checkbox" id="step3_show_UTR" name="step3_show_UTR" value="step3_show_UTR" on:click={() => {step3_show_UTR = !step3_show_UTR}}>
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
      <PSMAlignmentChart show_UTR={step3_show_UTR} />
      <h5>Identified peptides:</h5>
      <div id='peptide-table'>
        <PeptideTable />
      </div>
    </div>
    {/if}
  { :else }
    <div class="flex">
        <div id="overview-table" class='flex'>
          <HomePageOverview />
        </div>
        <div id="overview-2d-histo" class='flex flex-col ml-5 mt-5'>
          <h3>Filter genes:</h3>
          <span class="mb-2">Drag the mouse over the figure to select genes.</span>
          <Histogram2D />
        </div>
    </div>
  {/if}
</div>
