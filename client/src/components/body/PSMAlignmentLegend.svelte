<script lang="ts">
    import {displayPSMs} from '../../stores/stores'
    import {Tooltip, initTWE} from "tw-elements";
    initTWE({ Tooltip });

    const pep_categories_tooltips = [
        "Proteoform-specific peptides map uniquely to a single form of a protein (i.e., unique splice alternative and haplotype).",
        "Protein-specific peptides map to multiple sequences, which are all products of the same gene.",
        "Multi-gene peptides map to the products of different genes."
    ]

    export let show_category_tooltip: boolean;
    export let psm_group_names: string[];
    export let psm_group_colors: string[];
</script>

<style>

</style>

<div class="flex flex-nowrap">
    <h5 class="flex-shrink-0">Legend</h5>
    <div class='w-7 flex-shrink-0'></div>
    <div class='flex flex-wrap gap-5 items-center'>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=0 width=15 height=15 stroke="#888888" fill="#c9c9c9"></rect>
            </svg>
            <div>exon</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=20>
                <line x1=10 y1=0 x2=10 y2=15 stroke="#000000" stroke-width=2></line>
            </svg>
            <div>start / stop codon</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <circle cx=7 cy=8 r=3 stroke="none" fill="#0099ff"></circle>
            </svg>
            <div>splice site</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <circle cx=7 cy=8 r=3 stroke="none" fill="#CB0000"></circle>
            </svg>
            <div>variant locus (substitution)</div>
        </div>        
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=3 y=0 width=8 height=15 fill="#57B603"></rect>
            </svg>
            <div>variant locus (insertion)</div>
        </div> 
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=3 y=0 width=8 height=15 fill="#820000"></rect>
            </svg>
            <div>variant locus (deletion)</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=0 width=15 height=15 fill="#B7DAE7"></rect>
            </svg>
            <div>frameshift</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <circle cx=7 cy=8 r=3 stroke="none" fill="#8A8A8A"></circle>
            </svg>
            <div>variant locus (synonymous)</div>
        </div>  
        { #each psm_group_names as group_name, idx}            
            <div class='flex gap-2 items-center flex-shrink-0'>
                <svg height=15 width=15>
                    <rect x=0 y=0 width=15 height=15 stroke="none" fill={psm_group_colors[idx]}></rect>
                </svg>
                <div class="cursor-help" data-twe-toggle="tooltip" title={($displayPSMs ? "The height of the bar encodes the number of spectra matched to this peptide." : "The bar indicates a peptide that has been matched to a spectrum.") + (show_category_tooltip ? " " + pep_categories_tooltips[idx] : "")}>{($displayPSMs ? "PSMs (" : " Peptide (") + group_name + ")"}</div>
            </div>
        {/each}
        <!--<div class='group flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=0 width=15 height=15 stroke="none" fill="#EECC1C"></rect>
            </svg>
            <div class="cursor-help" data-twe-toggle="tooltip" title="Multi-gene peptides match the protein product of two or more different genes.">multi-gene peptide</div>
        </div>-->
    </div>
</div>