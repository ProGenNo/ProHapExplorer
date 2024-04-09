<!-- Component taken from https://svelte.dev/repl/82b00644720a4ca2bdb89c6a653ec987 -->
<script context="module" lang="ts">
  // retain module scoped expansion state for each tree node
  const _expansionState = {
    /* treeNodeId: expanded <boolean> */
  };

  export interface TreeNode {
    id: string,
    type: string,
    selected: boolean,
    label: string,
    children?: Array<TreeNode>
  }
</script>

<script lang="ts">
  //	import { slide } from 'svelte/transition'


  export let tree: TreeNode;
  export let nodeSelected: Function;

  $: label = tree.label;
  $: children = tree.children;
  $: id = tree.id;
  $: selected = tree.selected;

  // const { label, children, id, selected } = tree;

  const handleSelection = (evt: any) => {
    const targetID = evt.target.id;
    if (nodeSelected) nodeSelected(targetID);
  };

  let expanded = _expansionState[label] || false;
  const toggleExpansion = () => {
    expanded = _expansionState[label] = !expanded;
  };
  $: arrowDown = expanded;
</script>

<style>
  ul {
    margin: 0;
    list-style: none;
    padding-left: 1.2rem;
    user-select: none;
  }
  .no-arrow {
    padding-left: 1rem;
  }
  .arrow {
    cursor: pointer;
    display: inline-block;
    /* transition: transform 200ms; */
  }
  .arrowDown {
    transform: rotate(90deg);
  }
  span.clickable {
    cursor: pointer;
  }
  span.selected {
    font-weight: bold;
    cursor: pointer;
  }
</style>

<ul>
  <!-- transition:slide -->
  <li>
    {#if children}
      <span class="clickable" class:selected>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="arrow" class:arrowDown on:click="{toggleExpansion}">&#x25b6</span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
          on:click="{(evt) => {
            handleSelection(evt);
            if (!expanded) toggleExpansion();
          }}"
          id="{id}">{label}</span>
      </span>
      {#if expanded}
        {#each children as child}
          <svelte:self tree="{child}" nodeSelected="{nodeSelected}" />
        {/each}
      {/if}
    {:else}
      <span class="clickable" class:selected>
        <span class="no-arrow"></span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span id="{id}" on:click="{handleSelection}">{label}</span>
      </span>
    {/if}
  </li>
</ul>
