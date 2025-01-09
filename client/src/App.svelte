<script lang="ts">
  import HeaderBar from "./components/HeaderBar.svelte";
  import BodyContainer from "./components/BodyContainer.svelte";
  import SidebarGeneList from "./components/sidebar/SidebarGeneList.svelte";
  import SidebarFilter from "./components/sidebar/SidebarFilter.svelte";
  import BasicHistogram from "./components/basic/BasicHistogram.svelte";

  import { geneOverview, geneSearchRequestPending, geneSearchResult, proteoformSearchRequestPending, selectedTranscriptIdx } from "./stores/stores";
  import type { HistoData } from "./types/d3_elements";
  import { onMount } from "svelte";
  import { parseOverview } from "./tools/parseGraphQueryResult";
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
        console.log(data)
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
    { #if $geneSearchResult.length > 0 }
      <div id="search-result-left">
        <h5 class="mt-2 ml-2">Search results:</h5>
        <SidebarGeneList />
      </div>
      <hr class="mt-3" />    
      { #if $selectedTranscriptIdx !== -1}
        <div id="filter-histogram-left">
          { #if !($proteoformSearchRequestPending) }
            <h5 class="mt-3 ml-2 mb-2">Highlight:</h5>
            <SidebarFilter />
          { :else }
            <h4>Loading data...</h4>
          { /if }
        </div>
      { /if }
    { :else }
        <div>
          <h5 class="mt-2 ml-2">Included datasets</h5>
          <BasicHistogram id="dataset" data={datasetOverview} y_label={"# samples"}/>
        </div>
        <div>
          <h5 class="mt-2 ml-2">Tissues</h5>
          <BasicHistogram id="tissue" data={tissueOverview} y_label={"# samples"}/>
        </div>
    { /if }
  </div>
  <BodyContainer class="maincontent" />
  <div id='footer'>
    FOOTER
  </div>
</div>
