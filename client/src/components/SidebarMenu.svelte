<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { geneSearchResult, selectedGeneIdx, selectedTranscriptIdx } from "../stores/stores"
  import TreeView from "./TreeView.svelte";
  import type { TreeNode } from "./TreeView.svelte"
  import type { Gene, Transcript } from '../types/graph_nodes'

  let treeData: Array<TreeNode> = [];

  // Highlight tree elements after select
  const highlightTree = () => {
    // console.log("highlighting");
    treeData = [...treeData];
    treeData.forEach((gene, i) => {
      gene.selected = gene.id === $selectedGeneIdx.toString(); // boolean value indicating selection

      if (gene.hasOwnProperty("children")) {
        gene.children!.forEach((transcript, j) => {
          transcript.selected = gene.id === $selectedGeneIdx.toString() && j == $selectedTranscriptIdx;
        });
      }
    });
  };

  afterUpdate(() => {
    highlightTree();
  });

  // subtree starting with the gene
  // subscribe function called every time the search result changes
  const unsubscribe = geneSearchResult.subscribe((genes) => {
    treeData = [];

    genes.forEach((gene: Gene, i) => {
      treeData.push({
        id: i.toString(),
        type: "gene " + gene.gene_biotype,
        selected: i == $selectedGeneIdx,
        label: gene.gene_name != '-' ? gene.gene_name + ' (' + gene.id + ')' : gene.id,
        children: []
      });

      gene.transcripts.forEach((transcript: Transcript, j) => {
        treeData[treeData.length-1].children!.push({
          id: i + '|' + j,
          type: 'transcript ' + transcript.transcript_biotype,
          selected: i == $selectedGeneIdx && j == $selectedTranscriptIdx,
          label: transcript.id
        });
      });
    });

    selectedTranscriptIdx.set(0);
    selectedGeneIdx.set(0);
  });

  const handleSelection = (elementID: String) => {
    const selection = elementID.split("|").map((elem) => parseInt(elem));
    selectedGeneIdx.set(selection[0]);
    if (selection.length > 1) {
      selectedTranscriptIdx.set(selection[1]);
    } else {
      selectedTranscriptIdx.set(0);
      //selectedVariantIdx.set(-1);
    }
    /*
    if (selection.length > 2) {
      selectedVariantIdx.set(selection[2]);
    } else {
      selectedVariantIdx.set(-1);
    }*/
  };

  onDestroy(unsubscribe);
</script>

<style>
</style>

<div class="{$$props.class}">
  {#each treeData as tree}
    <TreeView tree="{tree}" nodeSelected="{handleSelection}" />
  {/each}
</div>
