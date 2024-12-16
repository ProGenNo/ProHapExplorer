<script lang="ts">
    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

    export let items: any[];
    /*let sortBy = {col: "id", ascending: true};

    $: sort = (column: string) => {
		
		if (sortBy.col == column) {
			sortBy.ascending = !sortBy.ascending
		} else {
			sortBy.col = column
			sortBy.ascending = true
		}
		
		// Modifier to sorting function for ascending or descending
		let sortModifier = (sortBy.ascending) ? 1 : -1;
		
		let sort = (a: any, b: any) => 
			(a[column] < b[column]) 
			? -1 * sortModifier 
			: (a[column] > b[column]) 
			? 1 * sortModifier 
			: 0;
		
            data = data.sort(sort);
	}*/
</script>

<style>
    #mainpage-gene-table {
        width: 50vw;
        height: 70vh;
        overflow: scroll;
    }
</style>

<div id="mainpage-gene-table">
    <Table id='mainpage-gene-table' {items} placeholder="Search by gene name" hoverable={true} filter={(item, searchTerm) => item.gene_name.toLowerCase().includes(searchTerm.toLowerCase())}>
        <TableHead>
          <TableHeadCell sort={(a, b) => a.id.localeCompare(b.id)}>Gene ID</TableHeadCell>
          <TableHeadCell sort={(a, b) => a.gene_name.localeCompare(b.gene_name)}>Name</TableHeadCell>
          <TableHeadCell sort={(a, b) => a.chrom.localeCompare(b.chrom)}>Chromosome</TableHeadCell>
          <TableHeadCell sort={(a, b) => a._total_proteoforms - b._total_proteoforms} defaultDirection="desc" defaultSort># Proteoforms</TableHeadCell>
        </TableHead>
        <TableBody tableBodyClass="divide-y">
          <TableBodyRow slot="row" let:item>
            <TableBodyCell>{item.id}</TableBodyCell>
            <TableBodyCell>{item.gene_name}</TableBodyCell>
            <TableBodyCell>{item.chrom}</TableBodyCell>
            <TableBodyCell>{item._total_proteoforms}</TableBodyCell>
          </TableBodyRow>
        </TableBody>
      </Table>
</div>