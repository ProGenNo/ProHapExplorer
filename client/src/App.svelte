<script lang="ts">
  import HeaderBar from "./components/HeaderBar.svelte";
  import BodyContainer from "./components/BodyContainer.svelte";
  import SidebarContainer from "./components/sidebar/SidebarContainer.svelte";

  import { geneOverview, geneSearchRequestPending } from "./stores/stores";
  import { onMount } from "svelte";
  import { parseOverview } from "./tools/parseGraphQueryResult";
  import type { HistoData } from "./types/d3_elements";
  import type { Gene } from "./types/graph_nodes";

  let datasetOverview: HistoData[] = []
  let tissueOverview: HistoData[] = []

  onMount(() => {
    geneSearchRequestPending.set(true)
    fetch("/overview", {
      method: "GET"
    })
      .then((r) => r.json())  // parse response to JSON
      .then((data) => {       // parse JSON to objects
        // Sort the genes so that the genes located on contigs instead of canonical chromosomes come last
        // console.log(data)
        datasetOverview = data[0]
        tissueOverview = data[1]
        const parsedData = parseOverview(data[2].map((elem: any) => elem.g)).sort((a: Gene, b: Gene) => (a.chrom.length - b.chrom.length));
        geneOverview.set(parsedData)
        geneSearchRequestPending.set(false)
      })
  })
</script>

<style>
  :global(.headerbar) {
    grid-area: header;
    min-height: 10vh;
    max-height: 20vh;
  }
  :global(.menuLeft) {
    /*background-color: brown;*/
    grid-area: sidebar;
    min-height: 70vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }
  :global(.maincontent) {
    @apply mt-5 ml-5;
    grid-area: maincontent;
    height: 90vh;
    overflow: scroll;
  }

  :global(.hidescrollbar::-webkit-scrollbar) {
    display: none;
  }

  #gridWrapper {
    display: grid;
    grid-gap: 10px;
    grid-template-columns: minmax(400px, 25%) 1fr 1fr;
    grid-template-areas:
      "header  maincontent  maincontent"
      "sidebar maincontent maincontent"
      "footer  footer  footer";
    background-color: #fff;
    color: #444;
  }
  
  #footer {
    grid-area: footer;
    background-color: #ccc;
    max-height: 10vh;
    justify-content: center;
  }
</style>

<div id="gridWrapper">
  <HeaderBar class="headerbar" />
  <!-- <SidebarMenu class="menuLeft" /> -->
  <SidebarContainer class="menuLeft hidescrollbar" datasetOverview={datasetOverview} tissueOverview={tissueOverview} />
  <BodyContainer class="maincontent hidescrollbar" />
  <div id='footer'>
    University of Bergen, 2025
  </div>
</div>
