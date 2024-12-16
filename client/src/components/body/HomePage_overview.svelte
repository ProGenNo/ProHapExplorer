<script lang="ts">
  import { onDestroy } from "svelte";
    import { geneOverview } from "../../stores/stores";
    import type { Gene } from "../../types/graph_nodes";
    import SearchTable from "../basic/SearchTable.svelte";

    let tableData: Gene[] = []

    const unsubscribe = geneOverview.subscribe(data => {
        tableData = data
    })

    onDestroy(unsubscribe)
</script>

{ #if tableData.length > 0}
    <SearchTable items={tableData} />
{ :else }
    <h4>Loading data...</h4>
{ /if }