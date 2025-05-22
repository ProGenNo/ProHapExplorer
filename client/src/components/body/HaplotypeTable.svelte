<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { activeTabIdx, proteoformSearchRequestPending, availableHaplotypes, selectedHaplotypeIdx, selectedHaplotypeGroupIdx, selectedProteoform, protRefSubrgaph, protHapSubrgaph, selectedTranscript, peptideHighlightFixed } from '../../stores/stores.js'
    import { parseProteoformSubgraph, addCanonicalPSMs } from "../../tools/parseGraphQueryResult.js"
    import type { Haplotype } from '../../types/graph_nodes.js'
    import {Tooltip, initTWE} from "tw-elements";
    initTWE({ Tooltip });

    export let filterHaplotypes: boolean;    // To be passed from parent component - display only haplotypes with a matching variant peptide, or all of them?

    let shownHaplotypeGroups: Array<Array<Haplotype>> = []
    let shownProteinChanges: Array<string> = []
    let showncDNAchanges: Array<string> = []
    let foundAltAllele: boolean[][] = []
    let selectedGroupMemberIdx = -1

    const max_UTR_synon_changes = 5

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
            const haplotypeIdx = $availableHaplotypes.findIndex(hap => hap.id === shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][selectedGroupMemberIdx].id)
            proteoformSearchRequestPending.set(true)
            selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), haplotypeIdx, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])

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
                    const parsedData = parseProteoformSubgraph(data, $availableHaplotypes[haplotypeIdx].matching_proteoform!);
                    //console.log(parsedData)
                    parsedData[0] = addCanonicalPSMs(parsedData[0], $protRefSubrgaph[$activeTabIdx][0]) 
                    protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [parsedData[0]], ...$protHapSubrgaph.slice($activeTabIdx+1)])
                    peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
                    proteoformSearchRequestPending.set(false)
                });
        } else {
            selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
            selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
            selectedGroupMemberIdx = -1
            peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
            protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
        }
    }

    async function haplotypeGroupClicked(this: HTMLDivElement, evt: any) {
        const haplotypeGroupIdx = parseInt(this.id.split('_')[2])
        const haplotypeGroup = shownHaplotypeGroups[haplotypeGroupIdx]

        const haplotypeIdx = $availableHaplotypes.findIndex(hap => hap.id === haplotypeGroup[0].id)

        if ($selectedHaplotypeGroupIdx[$activeTabIdx] !== haplotypeGroupIdx) {
            proteoformSearchRequestPending.set(true)
            selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), haplotypeIdx, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
            selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), haplotypeGroupIdx, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
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
                    const parsedData = parseProteoformSubgraph(data, $availableHaplotypes[haplotypeIdx].matching_proteoform!);
                    //console.log(parsedData)
                    parsedData[0] = addCanonicalPSMs(parsedData[0], $protRefSubrgaph[$activeTabIdx][0]) 
                    protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [parsedData[0]], ...$protHapSubrgaph.slice($activeTabIdx+1)])
                    peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
                    proteoformSearchRequestPending.set(false)
                });

        } else {
            selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
            selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
            selectedGroupMemberIdx = -1
            peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
            protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
        }
    }

    function HaplotypeGroupDeselect(evt: any) {
        selectedHaplotypeIdx.set([...$selectedHaplotypeIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeIdx.slice($activeTabIdx+1)])
        selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx.slice(0, $activeTabIdx), -1, ...$selectedHaplotypeGroupIdx.slice($activeTabIdx+1)])
        selectedGroupMemberIdx = -1
        peptideHighlightFixed.set([...$peptideHighlightFixed.slice(0, $activeTabIdx), [-1, -1],...$peptideHighlightFixed.slice($activeTabIdx+1)])
        protHapSubrgaph.set([...$protHapSubrgaph.slice(0, $activeTabIdx), [], ...$protHapSubrgaph.slice($activeTabIdx+1)])
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
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed combinations of alternative alleles in the protein-coding regions of the cDNA sequence (only non-synonymous variants)">cDNA Haplotype</div>
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed combinations of changes in the protein sequence">Protein Haplotype</div>
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed co-occurring alternative alleles in the 5' untranslated region of the cDNA">5' UTR</div>
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed co-occurring alternative alleles in the 3' untranslated region of the cDNA">3' UTR</div>
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed co-occurring alternative alleles of synonymous variants in the cDNA">Synonymous</div>
        <div class="font-semibold cursor-help" data-twe-toggle="tooltip" title="Observed frequency of this combination of alleles among all participants of the 1000 Genomes Project phase three">Frequency in 1000 Genomes</div>
        <div class="col-span-full"><hr/></div>

        <!--    All haplotype groups above the expanded one (or all of them if none expanded)    -->
        { #each shownHaplotypeGroups.slice(0,(($selectedHaplotypeGroupIdx[$activeTabIdx] === -1) ? shownHaplotypeGroups.length : $selectedHaplotypeGroupIdx[$activeTabIdx])) as haplotypeGroup, idx }

            <!--    If the filtering is on, show only the haplotype groups that have a mathcing variant peptide    -->
            {#if (!filterHaplotypes || foundAltAllele[idx].includes(true))}

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div id={'haplo_cDNAgroup_' + idx} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")} on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeGroupClicked}">
                    { #each showncDNAchanges[idx].split(';') as cDNA_change, cDNA_idx }
                        <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                            <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                            <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                        </div>
                    { /each }
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div id={'haplo_ProteinGroup_' + idx} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")} on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeGroupClicked}">
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
                <div class="col-span-full"><hr/></div>
            {/if}
        { /each }

        <!--    Expanded haplotype group (if any)    -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        {#if ($selectedHaplotypeGroupIdx[$activeTabIdx] > -1)}

            <!--    Make the coding change columns span all rows for this group (has to be done using inline styles)   -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            {#if (shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].coding_cDNA.length < 5)}

                <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]].length.toString() + ';'} class={'flex gap-1 col-start-1 col-span-1 items-stretch selected ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer")} on:click={$proteoformSearchRequestPending ? () => {} : HaplotypeGroupDeselect}>
                    { #each (shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].coding_cDNA) as cDNA_change, cDNA_idx }
                        <div class="flex flex-wrap border-gray-700 border rounded-md items-start">
                            <div class='grid grid-cols-1 justify-items-center h-30 mt-2'>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                            </div>
                        </div>
                    { /each }
                </div>            

                <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]].length.toString() + ';'} class={'flex gap-1 col-start-2 col-span-1 items-stretch selected ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer")} on:click={$proteoformSearchRequestPending ? () => {} : HaplotypeGroupDeselect}>
                    { #each (shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].coding_protein) as prot_change, prot_idx }
                        <div class={"flex flex-wrap rounded-md items-start " + (shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].alt_found_flag[prot_idx] ? 'border-green-700 border-2' : 'border-gray-700 border')}>
                            <div class='grid grid-cols-1 justify-items-center h-30 mt-2'>
                                <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                            </div>
                        </div>
                    { /each }
                </div>
            
            {:else}
                
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]].length.toString() + ';'} class={'flex gap-1 col-start-1 col-span-1 items-stretch selected ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer")} on:click={$proteoformSearchRequestPending ? () => {} : HaplotypeGroupDeselect}>
                    <div id={'haplo_cDNAgroup_' + $selectedHaplotypeGroupIdx[$activeTabIdx]} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")}>
                        { #each shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].coding_cDNA as cDNA_change, cDNA_idx }
                            <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                            </div>
                        { /each }
                    </div>
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div style={"grid-row: span " + shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]].length.toString() + ';'} class={'flex gap-1 col-start-2 col-span-1 items-stretch selected ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer")} on:click={$proteoformSearchRequestPending ? () => {} : HaplotypeGroupDeselect}>
                    <div id={'haplo_ProteinGroup_' + $selectedHaplotypeGroupIdx[$activeTabIdx]} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")} >
                        { #each shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].coding_protein as prot_change, prot_idx }
                            <div class={'grid grid-cols-1 justify-items-center rounded-md ' + (shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]][0].alt_found_flag[prot_idx] ? 'border-green-700 border-2' : 'border-gray-700 border')}>
                                <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                                <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                            </div>
                        { /each }
                    </div>
                </div>
            {/if}

            { #each shownHaplotypeGroups[$selectedHaplotypeGroupIdx[$activeTabIdx]] as haplotype, idx }
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_5UTR_' + idx} 
                    class={'flex col-start-3 mr-1' + (idx === selectedGroupMemberIdx ? " selected cursor-pointer" : ($proteoformSearchRequestPending ? " cursor-progress" : " cursor-pointer hover:font-semibold"))} 
                    on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeClicked}"
                    data-twe-toggle="tooltip" 
                    title={haplotype.UTR5_cDNA && (haplotype.UTR5_cDNA.length > max_UTR_synon_changes) ? haplotype.UTR5_cDNA.toString() : ""}
                >
                    {(haplotype.UTR5_cDNA && (haplotype.UTR5_cDNA.length > 0)) ? ( (haplotype.UTR5_cDNA.length > max_UTR_synon_changes) ? haplotype.UTR5_cDNA.slice(0, max_UTR_synon_changes).toString() + '...': haplotype.UTR5_cDNA) : '-'}
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_3UTR_' + idx} 
                    class={'flex col-start-4 mr-1' + (idx === selectedGroupMemberIdx ? " selected cursor-pointer" : ($proteoformSearchRequestPending ? " cursor-progress" : " cursor-pointer hover:font-semibold"))} 
                    on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeClicked}"
                    data-twe-toggle="tooltip" 
                    title={haplotype.UTR3_cDNA && (haplotype.UTR3_cDNA.length > max_UTR_synon_changes) ? haplotype.UTR3_cDNA.toString() : ""}
                >
                    {(haplotype.UTR3_cDNA && (haplotype.UTR3_cDNA.length > 0)) ? ((haplotype.UTR3_cDNA.length > max_UTR_synon_changes) ? haplotype.UTR3_cDNA.slice(0, max_UTR_synon_changes).toString() + '...' : haplotype.UTR3_cDNA) : '-'}
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->            
                <div id={'haplo_synon_' + idx} 
                    class={'flex col-start-5 mr-1' + (idx === selectedGroupMemberIdx ? " selected cursor-pointer" : ($proteoformSearchRequestPending ? " cursor-progress" : " cursor-pointer hover:font-semibold"))} 
                    on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeClicked}"
                    data-twe-toggle="tooltip" 
                >
                    {(haplotype.synonymous_cDNA && (haplotype.synonymous_cDNA.length > 0)) ? ((haplotype.synonymous_cDNA.length > max_UTR_synon_changes) ? haplotype.synonymous_cDNA.slice(0, max_UTR_synon_changes).toString() + '...' : haplotype.synonymous_cDNA) : '-'}
                </div>
                <div class={'col-start-6' + (idx === selectedGroupMemberIdx ? " selected" : "")}>{haplotype.frequency?.toFixed(6)}</div>
            { /each }

            <!--    All haplotype groups below the expanded one (if any)    -->
            {#if ($selectedHaplotypeGroupIdx[$activeTabIdx] < (shownHaplotypeGroups.length-1))}
                { #each shownHaplotypeGroups.slice($selectedHaplotypeGroupIdx[$activeTabIdx]+1, shownHaplotypeGroups.length) as haplotypeGroup, idx }
                    <div class="col-span-full"><hr/></div>

                    <!--    If the filtering is on, show only the haplotype groups that have a mathcing variant peptide    -->
                    {#if (!filterHaplotypes || foundAltAllele[idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1].includes(true))}

                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div id={'haplo_group_' + (idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1)} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")} on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeGroupClicked}">
                            { #each showncDNAchanges[(idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1)].split(';') as cDNA_change, cDNA_idx }
                                <div class='grid grid-cols-1 justify-items-center border-gray-700 border rounded-md'>
                                    <div class="pl-1 pr-1">{cDNA_change.split(':')[0]}</div>
                                    <div class="pl-1 pr-1">{cDNA_change.split(':')[1]}</div>
                                </div>
                            { /each }
                        </div>

                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div id={'haplo_ProteinGroup_' + (idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1)} class={'flex flex-wrap gap-1 ' + ($proteoformSearchRequestPending ? "cursor-progress" : "cursor-pointer hover:font-semibold")} on:click="{$proteoformSearchRequestPending ? () => {} : haplotypeGroupClicked}">
                            { #each shownProteinChanges[(idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1)].split(';') as prot_change, prot_idx }
                                <div class={'grid grid-cols-1 justify-items-center rounded-md ' + (foundAltAllele[idx + $selectedHaplotypeGroupIdx[$activeTabIdx] + 1][prot_idx] ? 'border-green-700 border-2' : 'border-gray-700 border')}>
                                    <div class="pl-1 pr-1">{prot_change.split(':')[0]}</div>
                                    <div class="pl-1 pr-1">{prot_change.split(':')[1].split('>')[0]}{">"}{prot_change.split(':')[2]}</div>
                                </div>
                            { /each }
                        </div>
                        <div>-</div>
                        <div>-</div>
                        <div>-</div>
                        <div>{haplotypeGroup.reduceRight((acc, hap) => acc + (hap.frequency ? hap.frequency : 0), 0).toFixed(6)} &emsp;</div>

                    { /if }

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