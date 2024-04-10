<script lang="ts">
    interface VariantType {
        hex: string,
        name: string
    }
    export let variantTypes: VariantType[] = []
</script>

<style>

</style>

<div class="flex flex-nowrap">    
    <h5 class="flex-shrink-0">Legend</h5>
    <div class='w-7 flex-shrink-0'></div>
    <div class='flex flex-wrap gap-5 items-center'>
        { #each variantTypes as vartype, idx }
            <div class='flex gap-2 items-center flex-shrink-0'>
                <svg height=15 width=10>
                    <line x1=5 y1=0 x2=5 y2=15 stroke={vartype.hex} stroke-width=2.5></line>
                </svg>
                <div>{vartype.name}</div>
            </div>
        { /each }
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=0 width=15 height=15 stroke="none" fill="#c9c9c9"></rect>
            </svg>
            <div>exon</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=0 width=15 height=15 stroke="none" fill="#e0e0e0"></rect>
            </svg>
            <div>exon (UTR)</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <line x1=0 y1=7.5 x2=15 y2=7.5 stroke="#CECECE" stroke-width=2></line>
            </svg>
            <div>intron</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=20>
                <rect x=0 y=0 width=10 height=15 stroke="none" fill="#e0e0e0"></rect>
                <rect x=10 y=0 width=10 height=15 stroke="none" fill="#c9c9c9"></rect>
                <line x1=10 y1=0 x2=10 y2=15 stroke="#000000" stroke-width=2></line>
            </svg>
            <div>start codon</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=20>
                <rect x=0 y=0 width=10 height=15 stroke="none" fill="#c9c9c9"></rect>
                <rect x=10 y=0 width=10 height=15 stroke="none" fill="#e0e0e0"></rect>
                <line x1=10 y1=0 x2=10 y2=15 stroke="#000000" stroke-width=2></line>
            </svg>
            <div>stop codon</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <svg height=15 width=15>
                <rect x=0 y=2.5 width=15 height=15 stroke="none" fill="#00589c"></rect>
            </svg>
            <div>matching peptide</div>
        </div>
        <div class='flex gap-2 items-center flex-shrink-0'>
            <div class='font-bold'>M</div>
            <div><a href="https://www.ncbi.nlm.nih.gov/refseq/MANE/" target="_blank">MANE Select</a> transcript</div>
        </div>
    </div>
</div>