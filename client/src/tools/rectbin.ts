import * as d3 from 'd3';
import { findLeftIndex } from './binarySearch';
import type { Gene, GeneBin } from "../types/graph_nodes";

export function rectbin_gene(data: Gene[], x_bins: number, y_bins: number, xLim: [number, number], yLim: [number, number]): GeneBin[] {

    // check how wide are the bins
    const xStep = (xLim[1] - xLim[0]) / x_bins
    const yStep = (yLim[1] - yLim[0]) / y_bins

    // get the bin limits (from - to)
    const xBreaks = Array.from(Array(x_bins+1), (_, index) => xLim[0] + index * xStep )
    const yBreaks = Array.from(Array(y_bins+1), (_, index) => yLim[0] + index * yStep )


    let result: GeneBin[] = Array.from(Array(x_bins * y_bins), (_, index) => {
        return {
            x_from: xBreaks[index % x_bins],
            x_to: xBreaks[(index % x_bins) + 1],
            y_from: yBreaks[Math.floor(index / x_bins)],
            y_to: yBreaks[Math.floor(index / x_bins) + 1],
            genes: []
        }
    })

    if (xBreaks.some((elem) => isNaN(elem)) || yBreaks.some((elem) => isNaN(elem))) {
        return []
    }

    // place the genes into bins
    data.forEach(gene => {
        const x_coord = findLeftIndex(xBreaks, gene._total_peptides!)
        const y_coord = findLeftIndex(yBreaks, gene._variant_peptides!)

        // console.log(gene._variant_peptides + ': ' + x_coord)

        result[x_coord + (y_coord * x_bins)].genes.push(gene)
    })

    return result
}