<script lang="ts">
  import { selectedGene, selectedTranscriptIdx } from "../stores/stores"
  import VariantsDropdown from "./basic/VariantsDropdown.svelte";
  import SplicingVariationSelector from './SplicingVariationSelector.svelte';
  import SequenceAnalysisAbbreviated from './SequenceAnalysisAbbreviated.svelte';
  import SequenceAnalysisFull from './SequenceAnalysisFull.svelte';
  import PSMAlignmentChart from './PSMAlignmentChart.svelte';
  import PeptideTable from "./PeptideTable.svelte";

  // Handle the toggle between abbreviated and full sequence view
  const step2_options = [
    { id: 1, text: `Abbreviated` },
    { id: 2, text: `Full` }
  ]  
  let step2_option = step2_options[0].id;
  async function handleViewToggle() {
    
  }

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
</style>

<div class="{$$props.class}">
  {#if $selectedGene}
    <div class="body-header">
        <div class="gene-name">{$selectedGene.gene_name != '-' ? $selectedGene.gene_name : $selectedGene.id}</div> 
        <div class="">gene - {$selectedGene.gene_biotype.replace('_', ' ')}</div>
        <div class="">Chromosome {$selectedGene.chrom}: {$selectedGene.bp_from.toLocaleString('en-US', {minimumFractionDigits: 0})} - {$selectedGene.bp_to.toLocaleString('en-US', {minimumFractionDigits: 0})}   {($selectedGene.strand == '+' ? "forward strand" : "reverse strand")}</div>
    </div>
    <hr />

    <div class='header step1-header'>
      <div>
        <h3 class="">1. Select splicing and variation</h3>        
        <p>&emsp;(select by interacting with the figure, or from the table below)</p>
      </div>
      <div>
        <p class="mb-1">Filter by variant:</p>
        <VariantsDropdown />
      </div>
    </div>
    <div class="body">
      <SplicingVariationSelector />
    </div>
    <hr />
  
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
      {#if step2_option === 1}
      <SequenceAnalysisAbbreviated />
      {/if}
      {#if step2_option === 2}
      <SequenceAnalysisFull />
      {/if}
    </div>
    <hr />

    <div class='header mt-2'>
      <h3>3. Coverage by mass spectra</h3>
    </div>
    <div class="body">
      <PSMAlignmentChart />
      <h5>Identified peptides:</h5>
      <div id='peptide-table'>
        <PeptideTable />
      </div>
    </div>

  {/if}
</div>
