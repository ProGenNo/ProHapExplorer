<script lang="ts">
  import { resetContents } from "../stores/bulk_operations";
  //import { Grid, Item, Row, Col } from "svelte-layouts";
  //import SearchBar from "./SearchBar.svelte";
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
      <h2 id="app-title" on:click={() => {resetContents()}}>ProHap Explorer</h2>
    </div>
    <!-- <div id="search">
      <SearchBar />
    </div>-->
</div>
