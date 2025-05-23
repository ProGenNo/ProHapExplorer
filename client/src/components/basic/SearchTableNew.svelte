<script lang="ts">
    //import { ArrowLeftOutline, ArrowRightOutline } from 'flowbite-svelte-icons';
    import { Pagination } from 'flowbite-svelte';
    import type { Gene } from '../../types/graph_nodes';
    import { geneSearchRequestPending, geneSearchResult, genesInTabs, peptideHighlightFixed, protHapSubrgaph, protRefSubrgaph, selectedGeneIdx, selectedHaplotypeGroupIdx, selectedHaplotypeIdx, selectedTranscriptIdx, selectedVariantIdx, showSidebarOverview } from '../../stores/stores';
    import { parseGeneSubgraph } from '../../tools/parseGraphQueryResult';
    import { CaretDownSolid, CaretUpSolid } from 'flowbite-svelte-icons';

    export let data: Gene[];

    interface ColnameMap {
        key: keyof Gene,
        name: string
    }

    // COLUMNS TO DISPLAY   
    const colnames: ColnameMap[] = [
        {key: "id", name: "Gene ID"}, 
        {key: "gene_name", name: "Gene name"},
        {key: "_total_proteoforms", name: "Proteoforms"},
        {key: "_total_peptides", name: "Peptides"},
        {key: "_variant_peptides", name: "Variant peptides"}
    ]

    const rows_per_page = 100
    let page_count: number = 1;
    let pages: {name: string;}[] = []
    let current_page = 1

    // SEARCHING AND SORTING DEFAULTS
    const search_column_idx = 1;
    let sort_column_idx = 4;
    let sort_direction = -1;

    // Create a collator for locale-aware string comparison
    const collator = new Intl.Collator('en', { sensitivity: 'base' });

    let sorted_data: Gene[] = []
    let search_string = ''
    let filtered_data: Gene[] = []

    const receive_data = (node: HTMLDivElement, param: Gene[]) => {
        sorted_data = sortData(param)
        filtered_data = sorted_data
        page_count = Math.ceil(filtered_data.length / rows_per_page)
        //pages = [...Array(page_count).keys()].map(x => ({name: (x+1).toString()}))

        return {
            update(param: Gene[]) {
                //console.log('Update data:')
                //console.log(param)
                sorted_data = sortData(param)
                filtered_data = sorted_data
                page_count = Math.ceil(filtered_data.length / rows_per_page)
                //pages = [...Array(page_count).keys()].map(x => ({name: (x+1).toString()}))
            }
        }
    }

    function getProperty<T, K extends keyof T>(obj: T, key: K) {
        return obj[key]; // Inferred type is T[K]
    }

    const sortData = (allData: Gene[]) => {
        let result: Gene[] = []

        if (allData.length === 0) {
            result = []
        }

        if (typeof(getProperty(allData[0], colnames[sort_column_idx].key)) === 'string') {
            ('sorting by string on ' + colnames[sort_column_idx].key)
            result = [ ...allData ].sort((a, b) => collator.compare(
                getProperty(a, colnames[sort_column_idx].key) as string, 
                getProperty(b, colnames[sort_column_idx].key) as string
            ) * sort_direction)
        } else {
            //console.log('sorting by numerical value on ' + colnames[sort_column_idx].key)
            result = [ ...allData ].sort((a, b) => ((getProperty(a, colnames[sort_column_idx].key) as number) - (getProperty(b, colnames[sort_column_idx].key) as number)) * sort_direction)
        }

        return result
    }

    const filterData = (evt: any) => {
        search_string = evt.target.value
        filtered_data = sorted_data.filter(g => g.gene_name.includes(search_string.toUpperCase()))
        
        page_count = Math.ceil(filtered_data.length / rows_per_page)
        //pages = [...Array(page_count).keys()].map(x => ({name: (x+1).toString()}))
    }    

    function handleSortClick(event: MouseEvent) {
        const col_idx = parseInt((event.target as HTMLDivElement).id.split('-')[2])

        if (sort_column_idx === col_idx) {
            sort_direction = -1 * sort_direction
        } else {
            sort_column_idx = col_idx
            sort_direction = -1
        }

        sorted_data = sortData(data)
        if (search_string.length > 0) {
            filtered_data = sorted_data.filter(g => g.gene_name.includes(search_string.toUpperCase()))   
        } else {
            filtered_data = sorted_data
        }     
        page_count = Math.ceil(filtered_data.length / rows_per_page)
    }

    const previousPage = () => {
        current_page = Math.max(current_page-1, 1)
    };
    const nextPage = () => {
        current_page = Math.min(current_page+1, page_count)
    };
    const handlePageClick = (evt: MouseEvent) => {
        const page_nr = parseInt((evt.target as HTMLButtonElement).innerText)
        //console.log('Page ' + page_nr)
        current_page = page_nr
    };

    // submit search query to the server -> handle response
    async function handleGeneClick(event: MouseEvent) {
        const gene = (event.target as HTMLDivElement).childNodes[0].textContent

        // add a new empty downstream selection corresponding to the new tab

        protHapSubrgaph.set([...$protHapSubrgaph, []])
        protRefSubrgaph.set([...$protRefSubrgaph, []])
        selectedTranscriptIdx.set([...$selectedTranscriptIdx, -1])
        selectedVariantIdx.set([...$selectedVariantIdx, -1])
        selectedHaplotypeIdx.set([...$selectedHaplotypeIdx, -1])
        selectedHaplotypeGroupIdx.set([...$selectedHaplotypeGroupIdx, -1])
        peptideHighlightFixed.set([...$peptideHighlightFixed, [-1, -1]])
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
            const origData = $geneSearchResult
            geneSearchResult.set([...origData, ...parsedData]);

            // add all the genes returned by the search to a new tab
            genesInTabs.set([...$genesInTabs, Array.from({length: parsedData.length}, (val, idx) => (origData.length + idx))])
            selectedGeneIdx.set([...$selectedGeneIdx, origData.length])

            geneSearchRequestPending.set(false)
            showSidebarOverview.set(false)
        });
    }
</script>

<style>
    #gene-table-wrapper {
        display: grid;
        grid-template-columns: 1fr;
        align-items: flex-start;
    }
    
    #gene-table-explore {        
        overflow: scroll;
        max-width: 100%;
        max-height: 60vh;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        column-gap: 12px;
        align-items: flex-start;
    }

    #pagination-bottom {
        width: 100%;
        overflow: hidden;
    }
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div id="gene-table-wrapper" use:receive_data={data}>
    <div class="flex flex-row" >
        <div class="text-gray-600 flex flex-row rounded max-w-xs my-3 bg-white" >
            <input type="search" on:input={filterData} bind:value={search_string} placeholder={"Search " + colnames[search_column_idx].name} class="h-10 w-64 rounded text-sm focus:outline-none px-3">
            <!--<SearchOutline class="w-4 h-4" />-->
        </div>
    </div>
    {#if (filtered_data.length > 0)}
        <div id="gene-table-explore">
            {#each colnames as col, idx}
                <div id={"col-header-" + idx} class="flex gap-1 font-semibold self-center items-center mb-2 cursor-pointer" on:click={handleSortClick}>
                    {col.name}
                    { #if (idx === sort_column_idx)}
                        { #if sort_direction == 1 }
                            <CaretUpSolid />
                        {:else}
                            <CaretDownSolid />
                        {/if}
                    {/if}
                </div>
            {/each}
            {#each filtered_data.slice((current_page-1) * rows_per_page, Math.min(current_page * rows_per_page, filtered_data.length)) as row}
                <div class="col-span-full mt-1 mb-1"><hr/></div>
                {#each colnames as col, idx}
                    <div class={"self-baseline" + ((idx < 2) ? " hover:cursor-pointer hover:font-semibold" : "")} on:click={(idx < 2 ? handleGeneClick : () => {})}>{getProperty(row, col.key)}</div>
                {/each}
            {/each}
        </div>
        <div id="pagination-bottom" class="flex gap-2 items-center justify-center mt-4">        
            <div class="text-sm text-gray-700 dark:text-gray-400">
                Showing <span class="font-semibold text-gray-900 dark:text-white">{(current_page-1) * rows_per_page + 1}</span>
                to
                <span class="font-semibold text-gray-900 dark:text-white">{Math.min(current_page * rows_per_page, filtered_data.length)}</span>
                of
                <span class="font-semibold text-gray-900 dark:text-white">{filtered_data.length}</span>
                Entries
            </div>
            <!--<Pagination {[]} on:previous={previousPage} on:next={nextPage}>
                <span slot='prev'>Prev</span>
                <span slot="next">Next</span>
            </Pagination>-->
            <Pagination {pages} on:previous={previousPage} on:next={nextPage} on:click={handlePageClick} />
        </div>
    {:else}
        <h4>No genes match the criteria</h4>
    {/if}
</div>