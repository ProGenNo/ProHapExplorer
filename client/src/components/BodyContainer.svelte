<script lang="ts">
  import { geneSearchRequestPending, selectedGene, selectedVariant, selectedVariantIdx, selectedTranscriptIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, protHapSubrgaph, displayPSMs, allHaplotypes } from "../stores/stores"
  import Dropdown from "./basic/Dropdown.svelte";
  import SplicingVariationSelector from './body/SplicingVariationSelector.svelte';
  //import SequenceAnalysisAbbreviated from './body/SequenceAnalysisAbbreviated.svelte';
  //import SequenceAnalysisFull from './body/SequenceAnalysisFull.svelte';
  import PSMAlignmentChart from './body/PSMAlignmentChart.svelte';
  import PeptideTable from "./body/PeptideTable.svelte";
  import { onDestroy } from "svelte";
  import { Tabs, TabItem } from 'flowbite-svelte';
  import HomePageExplore from "./body/HomePage_explore.svelte";
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
  /*.align-right {
    float: right;
    margin-right: 10vw;
  }*/
  .body-header {
    @apply flex gap-12 items-center mb-2;
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
  #overview-table {
    width: 40vw;
    margin-right: 2;
  }
  #overview-2d-histo {
    width: 25vw;
  }
</style>

<div class="{$$props.class}">
  {#if $geneSearchRequestPending}
    <h4>Loading data...</h4>
  {:else if $selectedGene}  
    <Tabs tabStyle="underline" contentClass="p-4 mt-4 bg-white">
      <TabItem title="Explore">
        <div class="flex">
            <div id="overview-table" class='flex'>
              <HomePageExplore />
            </div>
            <div id="overview-2d-histo" class='flex flex-col ml-5 mt-5'>
              <h3>Filter genes:</h3>
              <span class="mb-2">Drag the mouse over the figure to select genes, right-click to reset selection.</span>
              <Histogram2D />
            </div>
        </div>
      </TabItem> 
      <TabItem open title={$selectedGene.gene_name != '-' ? $selectedGene.gene_name : $selectedGene.id} class="">
        <div>
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
              <h3>2. Coverage by identified peptides</h3>
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
            <PSMAlignmentChart show_UTR={step3_show_UTR} />
            <PeptideTable />
          </div>
        {/if}        
      </div>
      </TabItem>     
      <TabItem title="About">
        <div class='mt-3'>
          <h3>TBA</h3>
        </div>
      </TabItem>
    </Tabs>
  { :else }
    <Tabs tabStyle="underline" contentClass="p-4 mt-4 bg-white">
      <TabItem open title="Explore">
        <div class="flex">
            <div id="overview-table" class='flex'>
              <HomePageExplore />
            </div>
            <div id="overview-2d-histo" class='flex flex-col ml-5 mt-5'>
              <h3>Filter genes:</h3>
              <span class="mb-2">Drag the mouse over the figure to select genes, right-click to reset selection.</span>
              <Histogram2D />
            </div>
        </div>
      </TabItem>
      <TabItem title="About">
        <div class='mt-3'>
          <h3>TBA</h3>
        </div>
      </TabItem>
    </Tabs>
  {/if}
</div>
