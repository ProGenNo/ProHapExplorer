<script lang="ts">
    import {Tooltip, initTWE} from "tw-elements";
    initTWE({ Tooltip });

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
            <div>variant locus</div>
        </div>
        { #each psm_group_names as group_name, idx}            
            <div class='flex gap-2 items-center flex-shrink-0'>
                <svg height=15 width=15>
                    <rect x=0 y=0 width=15 height=15 stroke="none" fill={psm_group_colors[idx]}></rect>
                </svg>
                <div class="cursor-help" data-twe-toggle="tooltip" title="The height of the bar encodes the number of spectra matched to this peptide.">{group_name} peptide</div>
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