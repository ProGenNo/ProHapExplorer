<script lang="ts">
  import { geneSearchRequestPending, selectedGene, showSidebarOverview } from "../stores/stores"
  import { Tabs, TabItem } from 'flowbite-svelte';
  import HomePageExplore from "./body/HomePage_explore.svelte";
  import HomePageAbout from "./body/HomePage_about.svelte";
  import Histogram2D from "./body/Histogram2D.svelte";
  import ExploreTabContent from "./body/ExploreTabContent.svelte";

  const tabClicked = (event: MouseEvent) => {
    const tab_title = (event.target! as HTMLButtonElement).textContent!
    showSidebarOverview.set((tab_title === "Explore") || (tab_title === 'About'))
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
    <Tabs tabStyle="pill" contentClass="p-4 mt-4 bg-white">

      <TabItem title="Explore"  on:click={tabClicked}>
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

      <TabItem open title={$selectedGene.gene_name != '-' ? $selectedGene.gene_name : $selectedGene.id} class=""  on:click={tabClicked}>
        <ExploreTabContent />
      </TabItem> 
          
      <TabItem title="About" on:click={tabClicked}>
        <div class='mt-3'>
          <HomePageAbout />
        </div>
      </TabItem>
    </Tabs>
  { :else }
    <Tabs tabStyle="pill" contentClass="p-4 mt-4 bg-white">
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
          <HomePageAbout />
        </div>
      </TabItem>
    </Tabs>
  {/if}
</div>
