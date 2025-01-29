<script lang="ts">
    import { onDestroy } from "svelte";
    import { geneOverviewFiltered } from "../../stores/stores";
    import type { Gene } from "../../types/graph_nodes";
    import SearchTable from "../basic/SearchTable.svelte";

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

{ #if ((tableData.length > 0) && (!timeout))}
    <SearchTable items={tableData} />
{ :else if (tableData.length === 0) }
    <h4>Loading data...</h4>
{ /if }