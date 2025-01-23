<script lang="ts">
  import { geneSearchRequestPending, geneSearchResult, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedTranscriptIdx, selectedVariantIdx } from "../../stores/stores";
  import { parseGeneSubgraph } from "../../tools/parseGraphQueryResult"
  import type { Gene } from "../../types/graph_nodes";
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  export let items: Gene[];

  // submit search query to the server -> handle response
  async function handleClick(event: MouseEvent) {
    const gene = (event.target as HTMLTableCellElement).childNodes[0].textContent

    // control for clicks on numerical values - ignore those
    if (!isNaN(parseFloat(gene!))) {
      return
    }

    // remove all the downstream selections first

    protHapSubrgaph.set([])
    protRefSubrgaph.set([])
    selectedGeneIdx.set(0)
    selectedTranscriptIdx.set(-1)
    selectedVariantIdx.set(-1)
    selectedHaplotypeIdx.set(-1)
    selectedHaplotypeGroupIdx.set(-1)
    geneSearchRequestPending.set(true)

    let requestData = { type: gene!.startsWith('ENSG') ? "Gene ID" : "Gene Name", value: gene };
    await fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
    .then((r) => {
        if (!r.ok) {
          geneSearchRequestPending.set(false)
        }
        return r.json()
      })  // parse response to JSON
      .then((data) => {       // parse JSON to objects
        // Sort the genes so that the genes located on contigs instead of canonical chromosomes come last
        const parsedData = parseGeneSubgraph(data).sort((a: Gene, b: Gene) => (a.chrom.length - b.chrom.length));
        geneSearchResult.set(parsedData);
        geneSearchRequestPending.set(false)
      });
  }
</script>

<style>
    #mainpage-gene-table {
        width: 50vw;
        height: 70vh;
        overflow: scroll;
    }
    .clickable {
      cursor: pointer;
    }
</style>

<div id="mainpage-gene-table">
    <Table id='mainpage-gene-table' {items} placeholder="Search by gene name" hoverable={true} filter={(item, searchTerm) => item.gene_name.toLowerCase().includes(searchTerm.toLowerCase())}>
        <TableHead>
          <TableHeadCell sort={(a, b) => a.id.localeCompare(b.id)}>Gene ID</TableHeadCell>
          <TableHeadCell sort={(a, b) => a.gene_name.localeCompare(b.gene_name)}>Name</TableHeadCell>
          <TableHeadCell sort={(a, b) => a._total_proteoforms - b._total_proteoforms} defaultDirection="desc">Proteoforms</TableHeadCell>
          <TableHeadCell sort={(a, b) => a._total_peptides - b._total_peptides} defaultDirection="desc">Peptides</TableHeadCell>
          <TableHeadCell sort={(a, b) => a._variant_peptides - b._variant_peptides} defaultDirection="desc" defaultSort>Variant Peptides</TableHeadCell>
        </TableHead>
        <TableBody tableBodyClass="divide-y">
          <TableBodyRow on:click={(evt) => handleClick(evt)} slot="row" let:item>
            <TableBodyCell><span class="clickable">{item.id}</span></TableBodyCell>
            <TableBodyCell><span class="clickable">{item.gene_name}</span></TableBodyCell>
            <TableBodyCell>{item._total_proteoforms}</TableBodyCell>
            <TableBodyCell>{item._total_peptides}</TableBodyCell>
            <TableBodyCell>{item._variant_peptides}</TableBodyCell>
          </TableBodyRow>
        </TableBody>
      </Table>
</div>