<script lang="ts">
    import { geneSearchResult, proteoformSearchRequestPending, selectedTranscriptIdx, showSidebarOverview } from "../../stores/stores";
    import SidebarFilter from "./SidebarFilter.svelte";
    import SidebarGeneList from "./SidebarGeneList.svelte";
    import BasicHistogram from "../basic/BasicHistogram.svelte";
    import BasicHistogramHorizontal from "../basic/BasicHistogramHorizontal.svelte";
    import type { HistoData } from "../../types/d3_elements";

    export let datasetOverview: HistoData[] = []
    export let tissueOverview: HistoData[] = []
</script>

<style>
  #search-result-left {
    max-height: 20vh;
  }

  #filter-histogram-left {
    min-height: 30vh;
    max-height: 45vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }
</style>

<div class="{$$props.class}">
    { #if !$showSidebarOverview }
      <div id="search-result-left">
        <h5 class="mt-2 ml-2">Search results:</h5>
        <SidebarGeneList />
      </div>
      <hr class="mt-3" />    
      { #if $selectedTranscriptIdx !== -1}
        <div id="filter-histogram-left">
          { #if !($proteoformSearchRequestPending) }
            <!-- <h5 class="mt-3 ml-2 mb-2">Highlight:</h5> -->
             <div class='mt-5'>
              <SidebarFilter />
             </div>
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
          <BasicHistogramHorizontal id="tissue" data={tissueOverview} y_label={"# samples"}/>
        </div>
    { /if }
</div>