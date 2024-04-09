<script lang="ts">
  import { geneSearchResult, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedTranscriptIdx, selectedVariantIdx } from "../stores/stores";
  import { parseGeneSubgraph } from "../tools/parseGraphQueryResult"

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
    selectedTranscriptIdx.set(0)
    selectedVariantIdx.set(-1)
    selectedHaplotypeIdx.set(-1)
    selectedHaplotypeGroupIdx.set(-1)

    let requestData = { type: selectedOption.text, value: searchString };
    await fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
      .then((r) => r.json())  // parse response to JSON
      .then((data) => {       // parse JSON to objects
        const parsedData = parseGeneSubgraph(data);
        geneSearchResult.set(parsedData);
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
