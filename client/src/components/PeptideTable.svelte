<script lang="ts">    
    import { onMount, onDestroy } from 'svelte';
    import { refAltProteoform } from '../stores/stores'
    import type { Peptide, Spectrum } from '../types/graph_nodes.js';
  import { max, mean, median, min } from 'd3';

    let allPeptides: Peptide[] = []

    const unsubscribe = refAltProteoform.subscribe(refAltProteoform => {
        allPeptides = []

        if (refAltProteoform.ref && (refAltProteoform.ref.length > 0)) {
            refAltProteoform.ref[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
                pept.position = refAltProteoform.ref[0].matching_peptide_positions![idx]
                allPeptides.push(pept)
            });
        }
        if (refAltProteoform.alt && (refAltProteoform.alt.length > 0)) {
            refAltProteoform.alt[0].matching_peptides!.forEach((pept: Peptide, idx: number) => {
                pept.position = refAltProteoform.alt[0].matching_peptide_positions![idx]
                allPeptides.push(pept)
            });
        }

        allPeptides.sort((a: Peptide, b: Peptide) => a.position! - b.position!)
    })

    onDestroy(unsubscribe)
</script>

<style>
    #peptide-table {
        overflow-x: scroll;
        max-width: 100%;
    }

    table tr td {
        border-right: 1px solid black;
    }

    table tr td:last-of-type {
        border: none;  
    }

    table tr th {
        border-right: 1px solid black;
    }

    table tr th:last-of-type {
        border: none;  
    }
</style>

{#if (allPeptides.length > 0)}
    <table id='peptide-table'>
        <tr>
            <th>Sequence  &ensp;</th>
            <th>Position  &ensp;</th>
            <th>Peptide Type  &ensp;</th>
            <th>Peptide Class  &ensp;</th>
            <th>Count of matching spectra</th>
            <th>PEP (min,median,max)  &ensp;</th>
            <th>Average RT  &ensp;</th>
        </tr>
        { #each allPeptides as peptide }
            <tr>
                <td>{peptide.sequence}</td>
                <td>{peptide.position}</td>
                <td>{peptide.class_1}</td>
                <td>{peptide.class_2}</td>
                <td>{peptide.matching_spectra.length}</td>
                <td>{min(peptide.PSM_PEP)} {median(peptide.PSM_PEP)} {max(peptide.PSM_PEP)}</td>
                <td>{mean(peptide.matching_spectra.map(spec => spec.retention_time))}</td>
            </tr>
        { /each }
    </table>
{:else}
    <h5>There are no matching peptides to this protein.</h5>
{/if}