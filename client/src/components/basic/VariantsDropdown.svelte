<script lang="ts">
    import { selectedGene, selectedVariant, selectedVariantIdx, selectedTranscriptIdx } from "../../stores/stores"
    import type { Variant } from '../../types/graph_nodes'
    import { onMount, onDestroy } from 'svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';
    import MenuItem from "./MenuItem.svelte";

    let menuOpen = false;
	let inputValue = "";

    let filteredItems: Variant[] = [];

    const handleInput = () => {
		filteredItems = $selectedGene.variants.filter((item: Variant) => item.id.toLowerCase().match(inputValue.toLowerCase()));	
	}

    const handleClear = () => {
        selectedVariantIdx.set(-1);
    }
</script>

<style>		
    .dropdown {
      position: relative;
      display: inline-block;
    }
        
    .dropdown-content {
      display: none;
      position: absolute;
      background-color: #f6f6f6;
      max-width: 200px;
      max-height: 35vh;
      overflow-y: scroll;
      border: 1px solid #ddd;
      z-index: 1;
    }

    #clear-icon {
        cursor: pointer;
    }
    
    /* Show the dropdown menu */	
    .show {display:block;}	
</style>

<section class="dropdown">
    <Button on:click={() => menuOpen = !menuOpen} menuText={$selectedVariant ? $selectedVariant.id : "Select variant"} disabled={$selectedTranscriptIdx === -1}/>
      
    <div id="myDropdown" class:show={menuOpen} class="dropdown-content">		
    <Input bind:inputValue on:input={handleInput} />		
          <!-- MENU -->
          {#if filteredItems.length > 0}
              {#each filteredItems as variant}
                  <MenuItem item={variant.id} />
              {/each}
          {:else}
              {#each $selectedGene.variants as variant, idx}
                  <MenuItem item={variant.id} />
              {/each}
          {/if}		
    </div>	
    {#if $selectedVariant }
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span id="clear-icon" on:click="{handleClear}">✖</span>
    {/if}
</section>