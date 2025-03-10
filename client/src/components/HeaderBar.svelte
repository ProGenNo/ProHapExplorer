<script lang="ts">
  //import { Grid, Item, Row, Col } from "svelte-layouts";
  import { highlightValues, highlightVariable, displayPSMs, geneSearchResult, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedTranscriptIdx, selectedVariantIdx } from "../stores/stores";
  //import SearchBar from "./SearchBar.svelte";

  function titleClicked(): void {
    geneSearchResult.set([])
    selectedTranscriptIdx.set(-1)
    selectedVariantIdx.set(-1)
    selectedHaplotypeIdx.set(-1)
    selectedHaplotypeGroupIdx.set(-1)
    selectedGeneIdx.set(0)
    protHapSubrgaph.set([])
    protRefSubrgaph.set([])
    displayPSMs.set(false)
    highlightVariable.set("pride_accession")
    highlightValues.set([])
  }
</script>

<style global>
  #headerWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: 500px minmax(200px, 1fr) 200px;
    grid-template-areas:
      "header  header  header"
      "search search empty";
    background-color: #fff;
    color: #444;
    margin-left: 1rem;
    margin-top: 0.5rem;
  }
  #top {
    grid-area: header;
  }
  /*#search {
    grid-area: search;
  }*/
  #app-title {
    cursor: pointer;
  }
</style>

<div class="{$$props.class}">
  <div id="headerWrapper">
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div id="top">
      <h2 id="app-title" on:click={() => {titleClicked()}}>ProHap Explorer</h2>
    </div>
    <!-- <div id="search">
      <SearchBar />
    </div>-->
  </div>
</div>
