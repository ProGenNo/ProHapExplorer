<script lang="ts">
	import Button from './Button.svelte';
	import Input from './Input.svelte';
    import MenuItem from "./MenuItem.svelte";

    export let allItems: string[] = []
    export let selectedItem: string | undefined = undefined
    export let handleClear : () => void
    export let handleSelect : (event: MouseEvent) => void
    export let isDisabled: boolean = false

    let menuOpen = false;
	let inputValue = "";

    let filteredItems: string[] = [];

    const handleInput = () => {
		filteredItems = allItems.filter((item: string) => item.toLowerCase().match(inputValue.toLowerCase()));	
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
    <Button on:click={() => menuOpen = !menuOpen} menuText={selectedItem ? selectedItem : "Select variant"} disabled={isDisabled}/>
      
    <div id="myDropdown" class:show={menuOpen} class="dropdown-content">		
    <Input bind:inputValue on:input={handleInput} />		
          <!-- MENU -->
          {#if filteredItems.length > 0}
              {#each filteredItems as item}
                  <MenuItem item={item} handleSelect={handleSelect}/>
              {/each}
          {:else}
              {#each allItems as item, idx}
                  <MenuItem item={item} handleSelect={handleSelect}/>
              {/each}
          {/if}		
    </div>	
    {#if selectedItem }
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span id="clear-icon" on:click="{handleClear}">✖</span>
    {/if}
</section>