<script>
    export let inputValue = "";
</script>

<style>
    /* The search field */
    #searchInput {
        box-sizing: border-box;
        font-size: 1rem;
        padding: 7px 0px 7px 30px;
        border: none;
        border-bottom: 1px solid #ddd;
    }
    #searchInput:focus {outline: 3px solid #ddd;}
        
    #search-icon {
        position: absolute;
        left: 5px;
        top: 5px;
        font-size: 1rem;
    }	
</style>

<input type="text" placeholder="Search..." autocomplete="off" id="searchInput" bind:value={inputValue} on:input>
<span id="search-icon">🔍</span>