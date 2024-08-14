<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { availableHaplotypes, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedProteoform, protRefSubrgaph, protHapSubrgaph, selectedTranscript } from '../../stores/stores.js'
    import { parseProteoformSubgraph, addCanonicalPSMs } from "../../tools/parseGraphQueryResult.js"
    import type { Haplotype } from '../../types/graph_nodes.js'

    let shownHaplotypeGroups: Array<Array<Haplotype>> = []
    let shownProteinChanges: Array<string> = []
    let showncDNAchanges: Array<string> = []
    let foundAltAllele: boolean[][] = []
    let selectedGroupMemberIdx = -1

    const unsubscribe = availableHaplotypes.subscribe(haplotypes => {
        filterGroupHaplotypes(haplotypes)
        //redraw()
    })

    /**
     * Groups the haplotypes such that there's one entry per unique protein sequence. Haplotypes producing the same sequence are grouped together.
     * @param haplotypes Array of all available haplotypes
     */
     function filterGroupHaplotypes(haplotypes: Array<Haplotype>): void {
        shownHaplotypeGroups = []
        shownProteinChanges = []
        showncDNAchanges = []
        foundAltAllele = []

        haplotypes.forEach(haplotype => {
            const codingChangesStr = haplotype.coding_protein!.join(';')
            if (codingChangesStr.length > 0) {
                const groupIdx = shownProteinChanges.indexOf(codingChangesStr)
                if (groupIdx === -1) {
                    shownProteinChanges.push(codingChangesStr)
                    showncDNAchanges.push(haplotype.coding_cDNA!.join(';'))
                    shownHaplotypeGroups.push([haplotype])
                    foundAltAllele.push(haplotype.alt_found_flag!)
                } else {
                    shownHaplotypeGroups[groupIdx].push(haplotype)
                }
            }
        });

        //console.log(foundAltAllele)
    }

    async function haplotypeClicked(this: HTMLDivElement, evt: any) {
        const clickedId = parseInt(this.id.split('_')[2])

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
                    const parsedData = parseProteoformSubgraph(data, $selectedTranscript!, $availableHaplotypes[haplotypeIdx]);
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
                    const parsedData = parseProteoformSubgraph(data, $selectedTranscript!, $availableHaplotypes[haplotypeIdx]);
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

    function HaplotypeGroupDeselect(evt: any) {
        selectedHaplotypeIdx.set(-1)
        selectedHaplotypeGroupIdx.set(-1)
        selectedGroupMemberIdx = -1
        protHapSubrgaph.set([])
    }

    onDestroy(unsubscribe)
</script>

<style>
    #haplotype-table {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        row-gap: 0.25rem;
        min-width: 50%;
        max-width: 100%;
    }
    .selected {
        @apply font-semibold;
    }
</style>

{#if (shownHaplotypeGroups.length > 0)}
    <div id='haplotype-table'>
        <!--    TABLE HEADER    -->
        <div class="font-semibold">cDNA Haplotype</div>
        <div class="font-semibold">Protein Haplotype</div>
        <div class="font-semibold">5' UTR</div>
        <div class="font-semibold">3' UTR</div>
        <div class="font-semibold">Synonymous</div>
        <div class="font-semibold">Frequency</div>
        <div class="col-span-full"><hr/></div>
        <!--    All haplotype groups above the expanded one (or all of them if none expanded)    -->
        { #each shownHaplotypeGroups.slice(0,(($selectedHaplotypeGroupIdx === -1) ? shownHaplotypeGroups.length : $selectedHaplotypeGroupIdx)) as haplotypeGroup, idx }
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div id={'haplo_cDNAgroup_' + idx} class='flex gap-1 cursor-pointer hover:font-semibold' on:click="{haplotypeGroupClicked}">
                { #each showncDNAchanges[idx].split(';') as cDNA_change, cDNA_idx }
                    <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                        <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                        <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                    </div>
                { /each }
            </div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div id={'haplo_ProteinGroup_' + idx} class='flex gap-1 cursor-pointer hover:font-semibold' on:click="{haplotypeGroupClicked}">
                { #each shownProteinChanges[idx].split(';') as prot_change, prot_idx }
                    <div class={'grid grid-cols-1 justify-items-center rounded-md ' + (foundAltAllele[idx][prot_idx] ? 'border-green-700 border-2' : 'border-gray-700 border')}>
                        <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                        <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                    </div>
                { /each }
            </div>
            <div>-</div>
            <div>-</div>
            <div>-</div>
            <div>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0).toFixed(6)} &emsp;</div>
        { /each }
        <!--    Expanded haplotype group (if any)    -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if ($selectedHaplotypeGroupIdx > -1)}
            {#if ($selectedHaplotypeGroupIdx > 0)} 
                <div class="col-span-full"><hr/></div>
            { /if }
            <!--    Make the coding change columns span all rows for this group (has to be done using inline styles)   -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx].length.toString() + ';'} class='flex gap-1 col-start-1 col-span-1 items-stretch selected cursor-pointer' on:click={HaplotypeGroupDeselect}>
                { #each (shownHaplotypeGroups[$selectedHaplotypeGroupIdx][0].coding_cDNA) as cDNA_change, cDNA_idx }
                    <div class="flex border-gray-700 border rounded-md items-center">
                        <div class='grid grid-cols-1 justify-items-center h-30'>
                            <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                            <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                        </div>
                    </div>
                { /each }
            </div>
            <!--    Make the coding change columns span all rows for this group (has to be done using inline styles)   -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx].length.toString() + ';'} class='flex gap-1 col-start-2 col-span-1 items-stretch selected cursor-pointer' on:click={HaplotypeGroupDeselect}>
                { #each (shownHaplotypeGroups[$selectedHaplotypeGroupIdx][0].coding_protein) as prot_change, prot_idx }
                    <div class={"flex rounded-md items-center " + (shownHaplotypeGroups[$selectedHaplotypeGroupIdx][0].alt_found_flag[prot_idx] ? 'border-green-700 border-2' : 'border-gray-700 border')}>
                        <div class='grid grid-cols-1 justify-items-center h-30'>
                            <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                            <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                        </div>
                    </div>
                { /each }
            </div>
            { #each shownHaplotypeGroups[$selectedHaplotypeGroupIdx] as haplotype, idx }
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_5UTR_' + idx} class={'flex hover:font-semibold cursor-pointer col-start-3' + (idx === selectedGroupMemberIdx ? " selected" : "")} on:click="{haplotypeClicked}">
                    {(haplotype.UTR5_cDNA && (haplotype.UTR5_cDNA.length > 0)) ? haplotype.UTR5_cDNA : '-'}
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_3UTR_' + idx} class={'flex hover:font-semibold cursor-pointer col-start-4' + (idx === selectedGroupMemberIdx ? " selected" : "")} on:click="{haplotypeClicked}">
                    {(haplotype.UTR3_cDNA && (haplotype.UTR3_cDNA.length > 0)) ? haplotype.UTR3_cDNA : '-'}
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_synon_' + idx} class={'flex hover:font-semibold cursor-pointer col-start-5' + (idx === selectedGroupMemberIdx ? " selected" : "")} on:click="{haplotypeClicked}">
                    {(haplotype.synonymous_cDNA && (haplotype.synonymous_cDNA.length > 0)) ? haplotype.synonymous_cDNA : '-'}
                </div>
                <div class={'col-start-6' + (idx === selectedGroupMemberIdx ? " selected" : "")}>{haplotype.frequency?.toFixed(6)}</div>
            { /each }
            <!--    All haplotype groups below the expanded one (if any)    -->
            {#if ($selectedHaplotypeGroupIdx < (shownHaplotypeGroups.length-1))}
                <div class="col-span-full"><hr/></div>
                { #each shownHaplotypeGroups.slice($selectedHaplotypeGroupIdx+1, shownHaplotypeGroups.length) as haplotypeGroup, idx }
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div id={'haplo_group_' + (idx + $selectedHaplotypeGroupIdx + 1)} class='flex gap-1 cursor-pointer hover:font-semibold' on:click="{haplotypeGroupClicked}">
                        { #each showncDNAchanges[(idx + $selectedHaplotypeGroupIdx + 1)].split(';') as cDNA_change, cDNA_idx }
                            <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                            </div>
                        { /each }
                    </div>
                    <div class='flex gap-1'>
                        { #each shownProteinChanges[(idx + $selectedHaplotypeGroupIdx + 1)].split(';') as prot_change, prot_idx }
                            <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                                <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                            </div>
                        { /each }
                    </div>
                    <div>-</div>
                    <div>-</div>
                    <div>-</div>
                    <div>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0).toFixed(6)} &emsp;</div>
                { /each }
            { /if }
        {/if}
    </div>
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