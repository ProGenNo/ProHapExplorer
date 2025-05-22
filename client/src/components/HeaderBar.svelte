<script lang="ts">
  //import { Grid, Item, Row, Col } from "svelte-layouts";
  import { highlightValues, highlightVariable, displayPSMs, geneSearchResult, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedTranscriptIdx, selectedVariantIdx, showSidebarOverview, genesInTabs, activeTabIdx, peptideHighlightFixed } from "../stores/stores";
  //import SearchBar from "./SearchBar.svelte";

  function titleClicked(): void {
    genesInTabs.set([])
    geneSearchResult.set([])
    activeTabIdx.set(0)
    selectedTranscriptIdx.set([])
    selectedVariantIdx.set([])
    selectedHaplotypeIdx.set([])
    selectedHaplotypeGroupIdx.set([])
    selectedGeneIdx.set([])
    protHapSubrgaph.set([[]])
    protRefSubrgaph.set([[]])
    displayPSMs.set(false)
    peptideHighlightFixed.set([])
    highlightVariable.set("pride_accession")
    highlightValues.set([])
    showSidebarOverview.set(true)
  }
</script>

<style global>
  /*#headerWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: 500px minmax(200px, 1fr) 200px;
    grid-template-areas:
      "header empty empty"
      "search search empty";
    background-color: #fff;
    color: #444;
    margin-left: 1rem;
    margin-top: 0.5rem;
  }*/
  #top {
    grid-area: header;
    max-width: minmax(400px, 25%);
  }
  /*#search {
    grid-area: search;
  }*/
  #app-title {
    cursor: pointer;
  }
</style>

<div class="{$$props.class}">
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div id="top" class="ml-2 mt-2">
      <h2 id="app-title" on:click={() => {titleClicked()}}>ProHap Explorer</h2>
    </div>
    <!-- <div id="search">
      <SearchBar />
    </div>-->
</div>
