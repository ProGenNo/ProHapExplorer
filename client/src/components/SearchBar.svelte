<script lang="ts">
  import { serverRequestPending, geneSearchResult, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedTranscriptIdx, selectedVariantIdx } from "../stores/stores";
  import { parseGeneSubgraph } from "../tools/parseGraphQueryResult"
  import type { Gene } from "../types/graph_nodes";

  let searchOptions = [
    { id: 1, text: `Gene Name` },
    { id: 2, text: `Gene ID` },
    //{ id: 3, text: `Variant` },
  ];

  let selectedOption = searchOptions[0];
  let searchString = "";

  // submit search query to the server -> handle response
  async function handleSubmit() {
    // remove all the downstream selections first

    protHapSubrgaph.set([])
    protRefSubrgaph.set([])
    selectedGeneIdx.set(0)
    selectedTranscriptIdx.set(-1)
    selectedVariantIdx.set(-1)
    selectedHaplotypeIdx.set(-1)
    selectedHaplotypeGroupIdx.set(-1)
    serverRequestPending.set(true)

    let requestData = { type: selectedOption.text, value: searchString };
    await fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
      .then((r) => {
        if (!r.ok) {
          serverRequestPending.set(false)
        }
        return r.json()
      })  // parse response to JSON
      .then((data) => {       // parse JSON to objects
        // Sort the genes so that the genes located on contigs instead of canonical chromosomes come last
        const parsedData = parseGeneSubgraph(data).sort((a: Gene, b: Gene) => (a.chrom.length - b.chrom.length));
        geneSearchResult.set(parsedData);
        serverRequestPending.set(false)
      });
  }
</script>

<style>
</style>

<form on:submit|preventDefault="{handleSubmit}" class="searchForm">
  <select bind:value="{selectedOption}" on:change="{() => (searchString = '')}">
    {#each searchOptions as option}
      <option value="{option}">
        {option.text}
      </option>
    {/each}
  </select>

  <input bind:value="{searchString}" />

  <button disabled="{false}" type="submit"> Search </button>
</form>
