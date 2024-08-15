<script lang="ts">
  //import { Grid, Item, Row, Col } from "svelte-layouts";
  import SearchBar from "./SearchBar.svelte";
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
  #title {
    grid-area: header;
  }
  #search {
    grid-area: search;
  }
</style>

<div class="{$$props.class}">
  <div id="headerWrapper">
    <div id="title">
      <h2>ProHap Explorer</h2>
    </div>
    <div id="search">
      <SearchBar />
    </div>
  </div>
</div>
