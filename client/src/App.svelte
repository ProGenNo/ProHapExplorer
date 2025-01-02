<script lang="ts">
  import HeaderBar from "./components/HeaderBar.svelte";
  import BodyContainer from "./components/BodyContainer.svelte";
  import SidebarGeneList from "./components/sidebar/SidebarGeneList.svelte";
  import SidebarFilter from "./components/sidebar/SidebarFilter.svelte";

  import { selectedTranscriptIdx } from "./stores/stores";
</script>

<style>
  :global(.headerbar) {
    grid-area: header;
    min-height: 10vh;
  }
  :global(.menuLeft) {
    /*background-color: brown;*/
    grid-area: sidebar;
    min-height: 10vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  :global(.maincontent) {
    grid-area: maincontent;
    height: 80vh;
    overflow: scroll;
  }

  #search-result-left {
    max-height: 20vh;
  }

  #filter-histogram-left {
    min-height: 30vh;
    max-height: 45vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  #gridWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: minmax(400px, 20%) 1fr 1fr;
    grid-template-areas:
      "header  header  header"
      "sidebar maincontent maincontent"
      "footer  footer  footer";
    background-color: #fff;
    color: #444;
  }
  #footer {
    grid-area: footer;
    background-color: burlywood;
    max-height: 10vh;
    justify-content: center;
  }
</style>

<div id="gridWrapper">
  <HeaderBar class="headerbar" />
  <!-- <SidebarMenu class="menuLeft" /> -->
  <div class="menuLeft">
    <div id="search-result-left">
      <h5 class="mt-2 ml-2">Search results:</h5>
      <SidebarGeneList />
    </div>
    <hr class="mt-3" />
    { #if $selectedTranscriptIdx !== -1}
      <div id="filter-histogram-left">
        <h5 class="mt-3 ml-2 mb-2">Highlight:</h5>
        <SidebarFilter />
      </div>
    { /if }
  </div>
  <BodyContainer class="maincontent" />
  <div id='footer'>
    FOOTER
  </div>
</div>
