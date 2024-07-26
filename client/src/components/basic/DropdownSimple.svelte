<script lang="ts">
	import Button from './Button.svelte';
    import MenuItem from "./MenuItem.svelte";

    export let allItems: string[] = []
    export let selectedItem: string | undefined = undefined
    export let handleSelect : (event: MouseEvent) => void
    export let isDisabled: boolean = false

    const itemClicked = (event: MouseEvent) => {
        handleSelect(event)
        menuOpen = false
    }

    let menuOpen = false;

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
    
    /* Show the dropdown menu */	
    .show {display:block;}	
</style>

<section class="dropdown">
    <Button on:click={() => menuOpen = !menuOpen} menuText={selectedItem ? selectedItem : "Select variant"} disabled={isDisabled}/>
      
    <div id="myDropdown" class:show={menuOpen} class="dropdown-content">	
        <!-- MENU -->
        {#each allItems as item, idx}
            <MenuItem item={item} handleSelect={itemClicked}/>
        {/each}
    </div>	
</section>