<script lang="ts">
    import * as d3 from 'd3';
    import { onMount, onDestroy } from 'svelte';
    import { availableHaplotypes, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedProteoform, protRefSubrgaph, protHapSubrgaph, selectedTranscript } from '../../stores/stores.js'
    import { parseProteoformSubgraph, addCanonicalPSMs } from "../../tools/parseGraphQueryResult.js"
    import type { D3LineElem, D3RectElem, D3TextElem } from '../../types/d3_elements.js'
    import type { Haplotype } from '../../types/graph_nodes.js';

    let vis: HTMLDivElement; // binding with div for visualization
    let width = 10
    let height = 10
    let shownHaplotypeGroups: Array<Array<Haplotype>> = []
    let shownProteinChanges: Array<string> = []
    let showncDNAchanges: Array<string> = []
    let collapsedGroupsBefore: Array<Array<Haplotype>> = ($selectedHaplotypeGroupIdx >= 0) ? shownHaplotypeGroups.slice(0,$selectedHaplotypeGroupIdx) : []
    let selectedGroupMemberIdx = -1

    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 30
    };

    const unsubscribe = availableHaplotypes.subscribe(haplotypes => {
        filterGroupHaplotypes(haplotypes)
        redraw()
    })

    onMount(() => {
        windowResized()
        window.addEventListener('resize', windowResized);
    })

    function windowResized(): void {
		// determine width & height of parent element and subtract the margin
		/*width = d3.select(vis).node().getBoundingClientRect().width - margin.left - margin.right;
		height = d3.select(vis).node().getBoundingClientRect().height - margin.top - margin.bottom;*/

        //drawAxisLabel()
        redraw()
    }

    /**
     * Groups the haplotypes such that there's one entry per unique protein sequence. Haplotypes producing the same sequence are grouped together.
     * @param haplotypes Array of all available haplotypes
     */
    function filterGroupHaplotypes(haplotypes: Array<Haplotype>): void {
        shownHaplotypeGroups = []
        shownProteinChanges = []
        showncDNAchanges = []

        haplotypes.forEach(haplotype => {
            const codingChangesStr = haplotype.coding_protein!.join(';')
            if (codingChangesStr.length > 0) {
                const groupIdx = shownProteinChanges.indexOf(codingChangesStr)
                if (groupIdx === -1) {
                    shownProteinChanges.push(codingChangesStr)
                    showncDNAchanges.push(haplotype.coding_cDNA!.join(';'))
                    shownHaplotypeGroups.push([haplotype])
                } else {
                    shownHaplotypeGroups[groupIdx].push(haplotype)
                }
            }
        });

        // console.log(shownHaplotypeGroups)
    }

    async function haplotypeClicked(this: HTMLDivElement, evt: any) {
        const clickedId = parseInt(this.id.split('_')[1])

        if (clickedId !== selectedGroupMemberIdx) {
            selectedGroupMemberIdx = clickedId
            const haplotypeIdx = $availableHaplotypes.findIndex(hap => hap.id === shownHaplotypeGroups[$selectedHaplotypeGroupIdx][selectedGroupMemberIdx].id)
            selectedHaplotypeIdx.set(haplotypeIdx)

            // Proteoform selected -> query the backend for the peptides and spectra
            await fetch("/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({type: 'Proteoform', value: $availableHaplotypes[haplotypeIdx].matching_proteoform!.id}),
                })
                .then((r) => r.json())  // parse response to JSON
                .then((data) => {       // parse JSON to objects
                    const parsedData = parseProteoformSubgraph(data);
                    parsedData[0] = addCanonicalPSMs(parsedData[0], $protRefSubrgaph[0]) 
                    protHapSubrgaph.set(parsedData);
                });
        } else {
            selectedHaplotypeIdx.set(-1)
            selectedHaplotypeGroupIdx.set(-1)
            selectedGroupMemberIdx = -1
            protHapSubrgaph.set([])
        }
    }

    async function haplotypeGroupClicked(this: HTMLDivElement, evt: any) {
        const haplotypeGroupIdx = parseInt(this.id.split('_')[2])
        const haplotypeGroup = shownHaplotypeGroups[haplotypeGroupIdx]

        const haplotypeIdx = $availableHaplotypes.findIndex(hap => hap.id === haplotypeGroup[0].id)

        if ($selectedHaplotypeGroupIdx !== haplotypeGroupIdx) {
            selectedHaplotypeIdx.set(haplotypeIdx)
            selectedHaplotypeGroupIdx.set(haplotypeGroupIdx)
            selectedGroupMemberIdx = 0

            // Proteoform selected -> query the backend for the peptides and spectra
            await fetch("/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({type: 'Proteoform', value: $availableHaplotypes[haplotypeIdx].matching_proteoform!.id}),
                })
                .then((r) => r.json())  // parse response to JSON
                .then((data) => {       // parse JSON to objects
                    const parsedData = parseProteoformSubgraph(data);
                    parsedData[0] = addCanonicalPSMs(parsedData[0], $protRefSubrgaph[0]) 
                    protHapSubrgaph.set(parsedData);
                });

        } else {
            selectedHaplotypeIdx.set(-1)
            selectedHaplotypeGroupIdx.set(-1)
            selectedGroupMemberIdx = -1
            protHapSubrgaph.set([])
        }
    }

    function redraw(): void {        
        d3.select(vis).html(null); 

        /*if (shownHaplotypes.length == 0) {
            return
        }

        const cDNA_col_width = Math.floor(width * 0.45)
        const prot_col_width = Math.floor(width * 0.45)
        const freq_col_width = Math.floor(width * 0.1)

        shownHaplotypes.forEach((haplotype, idx) => {

        })*/
    }

    onDestroy(unsubscribe)
</script>

<style>
    #vis {
		width: 100%;
		height: 15vh;
		background-color: white;
        overflow-x: scroll;
        overflow-y: scroll;
	}
    .haplotype-selector {
        cursor: pointer;
    }

    .selected {
        font-weight: bold;
    }

    .legend-line {
        stroke-width: 4;
    }

    #haplotype-table {
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

<!-- <div id="vis" bind:this={vis}></div> -->

{#if (shownHaplotypeGroups.length > 0)}
    <table id='haplotype-table'>
        {#if ($selectedHaplotypeGroupIdx === -1)}
            <tr>
                <th>cDNA Haplotype &ensp;</th>
                <th>Protein Haplotype &ensp;</th>
                <th>5' UTR &emsp;</th>
                <th>3' UTR &emsp;</th>
                <th>Synonymous &emsp;</th>
                <th>Frequency</th>
            </tr>
            { #each shownHaplotypeGroups as haplotypeGroup, idx }
                <tr>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <td id={'haplo_group_' + idx} class={'haplotype-selector' + (idx === $selectedHaplotypeGroupIdx ? " selected" : "")} on:click="{haplotypeGroupClicked}">{showncDNAchanges[idx]} &emsp;</td>
                    <td>{shownProteinChanges[idx]} &emsp;</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0)} &emsp;</td>
                </tr>
            { /each }
        { :else }            
            <tr>
                <th>cDNA Haplotype &ensp;</th>
                <th>Protein Haplotype &ensp;</th>
                <th>5' UTR &emsp;</th>
                <th>3' UTR &emsp;</th>
                <th>Synonymous &emsp;</th>
                <th>Frequency</th>
            </tr>
            {#if ($selectedHaplotypeGroupIdx > 0)}
                { #each shownHaplotypeGroups.slice(0,$selectedHaplotypeGroupIdx) as haplotypeGroup, idx }
                    <tr>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <td id={'haplo_group_' + idx} class='haplotype-selector' on:click="{haplotypeGroupClicked}">{showncDNAchanges[idx]}&emsp;</td>
                        <td>{shownProteinChanges[idx]}&emsp;</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0)}</td>
                    </tr>
                { /each }
                <tr><td colspan="6"><hr/></td></tr>
            {/if}
            { #each shownHaplotypeGroups[$selectedHaplotypeGroupIdx] as haplotype, idx }
                <tr>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <td id={'haplo_' + idx} class={'haplotype-selector' + (idx === selectedGroupMemberIdx ? " selected" : "")} on:click="{haplotypeClicked}">{haplotype.coding_cDNA}&emsp;</td>
                    <td class={(idx === selectedGroupMemberIdx ? " selected" : "")}>{haplotype.coding_protein}&emsp;</td>
                    <td class={(idx === selectedGroupMemberIdx ? " selected" : "")}>{(haplotype.UTR5_cDNA && (haplotype.UTR5_cDNA.length > 0)) ? haplotype.UTR5_cDNA : '-'}&emsp;</td>
                    <td class={(idx === selectedGroupMemberIdx ? " selected" : "")}>{(haplotype.UTR3_cDNA && (haplotype.UTR3_cDNA.length > 0)) ? haplotype.UTR3_cDNA : '-'}&emsp;</td>
                    <td class={(idx === selectedGroupMemberIdx ? " selected" : "")}>{(haplotype.synonymous_cDNA && (haplotype.synonymous_cDNA.length > 0)) ? haplotype.synonymous_cDNA : '-'}&emsp;</td>
                    <td class={(idx === selectedGroupMemberIdx ? " selected" : "")}>{haplotype.frequency}</td>
                </tr>
            { /each }
            {#if ($selectedHaplotypeGroupIdx < (shownHaplotypeGroups.length-1))}
                <tr><td colspan="6"><hr/></td></tr>
                { #each shownHaplotypeGroups.slice($selectedHaplotypeGroupIdx+1, shownHaplotypeGroups.length) as haplotypeGroup, idx }
                    <tr>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <td id={'haplo_group_' + (idx + $selectedHaplotypeGroupIdx+1)} class='haplotype-selector' on:click="{haplotypeGroupClicked}">{showncDNAchanges[idx+$selectedHaplotypeGroupIdx+1]}&emsp;</td>
                        <td>{shownProteinChanges[idx+$selectedHaplotypeGroupIdx+1]}&emsp;</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0)}</td>
                    </tr>
                { /each }
            {/if}
        {/if}
    </table>
{ :else }
    {#if ($availableHaplotypes.length > 0)}
        <h5>{$selectedTranscript ? $selectedTranscript.id : ''}: No haplotype matching your selection encodes an alternative sequence.</h5>
        <p>The haplotypes matching your selection consist of synonymous and/or UTR variants only.</p>
    {:else}
        { #if $selectedTranscript }
            <h5>{$selectedTranscript.id}: There are no haplotypes matching your selection in the database.</h5>
        { :else }
            <h5>Select a transcript to view haplotypes.</h5>
        { /if }
    { /if }
{ /if }