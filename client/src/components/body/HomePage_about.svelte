<script lang="ts">
    import { Card, Button } from 'flowbite-svelte';
    import { ArrowRightOutline } from 'flowbite-svelte-icons';
</script>

<style>
    
</style>

<div class="flex gap-2">
    <Card img="img/protein_haplotype.png" reverse={true} size="md">
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Protein Haplotypes</h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">Protein haplotypes are unique protein sequences encoded by sets of alleles in linkage disequilibrium. Accounting for these protein haplotypes will enable us to fine-chart the human proteome, thereby acknowledging the diversity across populations.</p>
    </Card>
    
    <Card size='sm'>
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">ProHap</h5>
        <p class="mb-6 font-normal text-gray-700 dark:text-gray-400 leading-tight">ProHap is a tool published by our team at the University of Bergen that creates databases of protein haplotypes from genotype panels of human populations.</p>
        <Button href="https://github.com/ProGenNo/ProHap" target="_blank">
            Read more <ArrowRightOutline class="w-6 h-6 ms-2 text-white" />
        </Button>
    </Card>

    <Card size='lg'>
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Sequence Database in ProHap Explorer</h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
            We have used ProHap to create a database of protein haplotypes derived from the genotypes of the 1000 Genomes Project. Individual variants were thresholded at a 1% minor allele frequency, with no haplotype frequency threshold applied. 
            Variants mapping to the untranslated regions of transcripts (UTRs) were retained in the haplotypes; however, only the translation of the main open reading frame (mORF) was used in the resulting database of protein haplotype sequences. 
        </p>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
            A simpler version of this database, where the variants mapping to the UTRs were excluded completely, can be found at this <a href="https://doi.org/10.5281/zenodo.10149277" target="_blank">Zenodo repository</a>.
        </p>
    </Card>
</div>
<div class="mt-2 flex gap-2">
    <Card size='md'>
        <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dataset in ProHap Explorer</h5>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
            We used this sequence database to search a public mass spectrometry proteomic dataset of healthy human tissues, downloaded from the PRIDE repository <a href="https://www.ebi.ac.uk/pride/archive/projects/PXD010154" target="_blank">PXD010154</a>.
            For the search, we used SearchGUI version 4.3.1 and PeptideShaker version 3.0.0, using the X!Tandem and Tide search engines. 
        </p>
        <p class="mb-3 font-normal text-gray-700 dark:text-gray-400 leading-tight">
            Resulting PSMs were processed as described in <a href="https://doi.org/10.1021/acs.jproteome.3c00243" target="_blank">this publication</a> using Percolator version 3.5, with features based on peptide retention time (DeepLC version 1.1.2) and fragmentation (MS2PIP version 3.9.0) predictors, and filtered at a 1% estimated false discovery rate (FDR). We then used the <a href="https://github.com/ProGenNo/ProHap_PeptideAnnotator" target="_blank">ProHap Peptide Annotator</a> pipeline to annotate the identified peptides with the corresponding transcripts, gene names, and matching alleles of genomic variants.        
        </p>
    </Card>
</div>
