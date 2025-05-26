<script lang="ts">
    import { onDestroy } from "svelte";
    import { geneOverviewFiltered } from "../../stores/stores";
    import type { Gene } from "../../types/graph_nodes";
    //import SearchTable from "../basic/SearchTable.svelte";
    import SearchTableNew from "../basic/SearchTableNew.svelte";
    import Histogram2D from "./Histogram2D.svelte";

    let tableData: Gene[] = []
    let timeout = false

    // we have to force re-render the child component due to an unknown bug
    // temp solution: remove the content for 0.01s and render the table again
    // results in a quick flash but works for now
    const unsubscribe = geneOverviewFiltered.subscribe(data => {
        timeout = true
        tableData = data
        if (data.length > 0){
            setTimeout(() => {timeout = false}, 10);
        }
    })

    onDestroy(unsubscribe)
</script>

<style>    
  #overview-table {
    width: 40vw;
    margin-right: 2;
  }
  #overview-2d-histo {
    width: 25vw;
  }
</style>

<div class="flex">
    <div id="overview-table" class='flex'>
        { #if ((tableData.length > 0) && (!timeout))}
            <SearchTableNew data={tableData} />
            <!--<SearchTable items={tableData} />-->
        { :else if (tableData.length === 0) }
            <h4>No genes match the criteria</h4>
        { /if }
    </div>
    <div id="overview-2d-histo" class='flex flex-col ml-5 mt-5'>
        <h3>Filter genes:</h3>
        <span class="mb-2">Drag the mouse over the figure to select genes, right-click to reset selection.</span>
        <Histogram2D />
    </div>
</div>