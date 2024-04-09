<script>
    import { selectedGene, selectedVariantIdx } from "../../stores/stores"
	export let item;

    const handleSelect = () => {
        const variantIdx = $selectedGene.variants.findIndex((variant) => variant.id === item)
        selectedVariantIdx.set(variantIdx)
    }
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
<span on:click="{handleSelect}">{item}</span>