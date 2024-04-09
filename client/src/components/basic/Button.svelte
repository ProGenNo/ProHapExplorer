<script>
	export let menuText;
    export let disabled = false;
</script>

<style>	
    /* Dropdown Button */
    .dropbtn {
        background-color: rgb(70, 70, 70);
        color: white;
        padding: 7px;
        font-size: 16px;
        border: none;
        cursor: pointer;
    }
        
    /* Dropdown button on hover & focus */
    .dropbtn:hover, .dropbtn:focus {
        background-color: #3e8e41;
    }
</style>

<button on:click class="dropbtn" disabled={disabled}>{menuText}</button>