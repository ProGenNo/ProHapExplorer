<script lang="ts">
  	export let item: string;
    export let handleSelect : (event: MouseEvent) => void;
</script>

<style>
span {
  color: black;
  padding: 5px 10px;
  text-decoration: none;
  display: block;
}	
	
span:hover {background-color: #ddd}
</style>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<span id={"menuItem_" + item} on:click="{handleSelect}">{item}</span>