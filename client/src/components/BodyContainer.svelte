<script lang="ts">
  import { activeTabIdx, geneSearchRequestPending, geneSearchResult, genesInTabs, peptideHighlightFixed, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeGroupIdx, selectedHaplotypeIdx, selectedTranscriptIdx, selectedVariantIdx, showSidebarOverview } from "../stores/stores"
  import { Tabs, TabItem } from 'flowbite-svelte';
  import HomePageExplore from "./body/HomePage_explore.svelte";
  import HomePageAbout from "./body/HomePage_about.svelte";
  import ExploreTabContent from "./body/ExploreTabContent.svelte";
  import { resetContents } from "../stores/bulk_operations";

  const tabClicked = (event: MouseEvent) => {
    const tab_title = (event.target! as HTMLButtonElement).textContent!
    showSidebarOverview.set((tab_title === "Explore") || (tab_title === 'About'))
  }

  const tabClosed = (event: MouseEvent) => {
    const tab_idx = parseInt((event.target! as HTMLButtonElement).id.split('-')[2])
    //console.log('Closing tab: ' + tab_idx)
    const isLastTab = $genesInTabs.length === 1

    if (isLastTab) {
      resetContents()
    } else {
      // Open the tab to the right, unless closing the rightmost (then move one to the left)
      activeTabIdx.set(Math.min($activeTabIdx, $genesInTabs.length-2))

      // Remove the selections in the current tab
      selectedTranscriptIdx.set([...$selectedTranscriptIdx.slice(0, tab_idx), ...$selectedTranscriptIdx.slice(tab_idx+1)])
      selectedVariantIdx.set([...$selectedVariantIdx.slice(0, tab_idx), ...$selectedVariantIdx.slice(tab_idx+1)])
      selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, tab_idx), ...$selectedHaplotypeIdx.slice(tab_idx+1)])
      selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, tab_idx), ...$selectedHaplotypeGroupIdx.slice(tab_idx+1)])
      peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, tab_idx), ...$peptideHighlightFixed.slice(tab_idx+1)])

      // indexes of genes in geneSearchResult to be removed
      const genes_to_remove = $genesInTabs[tab_idx]

      // shift the indexes in the downstream tabs (both in tab contents and currently selected)
      genesInTabs.set([...$genesInTabs.slice(0, tab_idx), ...$genesInTabs.slice(tab_idx+1).map(elem => elem.map(g_idx => g_idx - genes_to_remove.length))])
      selectedGeneIdx.set([...$selectedGeneIdx.slice(0, tab_idx), ...$selectedGeneIdx.slice(tab_idx+1).map(g_idx => g_idx - genes_to_remove.length)])    

      // remove the contents of the closed tab
      geneSearchResult.set([...$geneSearchResult.slice(0, genes_to_remove[0]), ...$geneSearchResult.slice(genes_to_remove[genes_to_remove.length-1]+1)])    
      protHapSubrgaph.set([...$protHapSubrgaph.slice(0, tab_idx), ...$protHapSubrgaph.slice(tab_idx+1)])
      protRefSubrgaph.set([...$protRefSubrgaph.slice(0, tab_idx), ...$protRefSubrgaph.slice(tab_idx+1)])
    }
  }

</script>

<style>
  /*.align-right {
    float: right;
    margin-right: 10vw;
  }*/
  :global(.accordion-item) {
		border-bottom: 1px solid rgb(110, 110, 110);
	} 
</style>

<div class="{$$props.class}">
  {#if $geneSearchRequestPending}
    <h4>Loading data...</h4>
  {:else if $genesInTabs.length > 0}  
    <Tabs tabStyle="pill" contentClass="p-4 mt-4 bg-white">

      <TabItem title="Explore" on:click={tabClicked}>
        <HomePageExplore />
      </TabItem> 

      {#each $genesInTabs as tabGenes, tabIdx}
        <TabItem 
          open={tabIdx === ($genesInTabs.length-1)} 
          title={$geneSearchResult[tabGenes[0]].gene_name != '-' ? $geneSearchResult[tabGenes[0]].gene_name : $geneSearchResult[tabGenes[0]].id} class="" 
          on:click={tabClicked}
        >
          <ExploreTabContent tabIdx={tabIdx} handleTabClose={tabClosed} />
        </TabItem>        
      {/each}
          
      <TabItem title="About" on:click={tabClicked}>
        <div class='mt-3'>
          <HomePageAbout />
        </div>
      </TabItem>
    </Tabs>
  { :else }
    <Tabs tabStyle="pill" contentClass="p-4 mt-4 bg-white">
      <TabItem open title="Explore">
        <HomePageExplore />
      </TabItem>
      <TabItem title="About">
        <div class='mt-3'>
          <HomePageAbout />
        </div>
      </TabItem>
    </Tabs>
  {/if}
</div>
