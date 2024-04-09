import { writable, derived } from "svelte/store";

export const dbSearchResult = writable([]);
export const selectedGeneIdx = writable(-1);
export const selectedTranscriptIdx = writable(-1);
export const selectedVariantIdx = writable(-1);
export const selectedGene = derived([selectedGeneIdx, dbSearchResult], ([$selectedGeneIdx, $dbSearchResult]) => {
  if ($selectedGeneIdx != -1) return $dbSearchResult[$selectedGeneIdx];
  else return undefined;
});
export const selectedProtein = derived([selectedGene, selectedTranscriptIdx], ([$selectedGene, $selectedTranscriptIdx]) => {
  if ($selectedTranscriptIdx == -1) return undefined;
  else if ($selectedGene && $selectedGene.hasOwnProperty("ref_proteins")) return $selectedGene["ref_proteins"][$selectedTranscriptIdx];
});
export const selectedVariant = derived(
  [selectedGene, selectedProtein, selectedVariantIdx],
  ([$selectedGene, $selectedProtein, $selectedVariantIdx]) => {
    if ($selectedVariantIdx == -1) return undefined;
    else if ($selectedProtein && $selectedProtein.hasOwnProperty("variants")) return $selectedProtein["variants"][$selectedVariantIdx];
    else if ($selectedGene && $selectedGene.hasOwnProperty("protein_variants"))
      return $selectedGene["protein_variants"][$selectedVariantIdx];

    return undefined;
  }
);
export const variantsForSelectedGene = derived([selectedGene, selectedProtein], ([$selectedGene, $selectedProtein]) => {
  if ($selectedProtein && $selectedProtein.hasOwnProperty("variants")) return $selectedProtein["variants"];
  else if ($selectedGene && $selectedGene.hasOwnProperty("protein_variants")) return $selectedGene["protein_variants"];

  return undefined;
});
