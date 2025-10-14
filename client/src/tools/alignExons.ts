import type { SplicingAlignmentRegion } from '../types/alignment_types'
import { SplicingRegionType } from '../types/alignment_types'
import type { D3RectElem, D3LineElem } from '../types/d3_elements'
import type { Gene, Exon } from '../types/graph_nodes'

enum AlignEventType {
    Start = 0,
    Stop = 1
}

const exonScreenSpace = 0.8
const intronScreenSpace = (1 - exonScreenSpace) 
/*
export function testAlignment(): void {
    /*const test_gene: Gene = {
        bp_from: 1,
        bp_to: 500,
        chrom: '1',
        gene_biotype: 'test',
        gene_name: 'TEST',
        gene_version: 1,
        id: 'TEST0005',
        strand: '+',
        variants: [],
        transcripts: [
            {
                id: 'TEST',

                canonical_protein: null,
                cDNA_sequence: 'AAAAAAAAAA',
                ensembl_canonical: false,
                exons: [],
                haplotypes: []
            }
        ]
    }

    const test_exons: Array<Exon> = [
        {
            bp_from: 1, 
            bp_to: 10,
            id: 'TEST1'
        },
        {
            bp_from: 100,
            bp_to: 120,
            id: 'TEST2'
        },
        {
            bp_from: 225,
            bp_to: 255,
            id: 'TEST2'
        },
        {
            bp_from: 300,
            bp_to: 380,
            id: 'TEST3'
        }
    ]

    const alignment = alignExons(test_exons, '+')

    const exon_lengths = test_exons.map(exon => {
        const xFrom = getScreenX(exon.bp_from, alignment, 500)
        const xTo = getScreenX(exon.bp_to, alignment, 500)

        return xTo - xFrom
    })

    console.log(exon_lengths)
}*/

/**
 * Returns an alignment object as a list of regions, to be used when mapping genomic coordinates to screen coordinates
 * @param all_exons A list of Exon objects
 * @param strand '+' or '-' value indicating 
 */
export function alignExons(all_exons: Array<Exon>, strand: string) {
    const strand_factor = strand === '+' ? 1 : -1
    const start_events = all_exons.map(exon => {
        return {
            type: strand_factor === 1 ? AlignEventType.Start : AlignEventType.Stop,
            loc: exon.bp_from * strand_factor
        }
    })
    const stop_events = all_exons.map(exon => {
        return {
            type: strand_factor === 1 ? AlignEventType.Stop : AlignEventType.Start,
            loc: exon.bp_to * strand_factor
        }
    })

    // sort all events by location from lowest to highest
    let event_queue = [...start_events, ...stop_events].sort((a, b) =>  a.loc - b.loc)  // list of events (start or end of an exon) ordered by location
    let alignment_result_tmp: Array<SplicingAlignmentRegion> = []                       // temporary alignment - aggregated introns and exons
    let overlappingExons = 1                                                            // how many exons are currently overlapping the sweep line?
    let previousEventLoc = event_queue[0].loc                                           // location of the previous switch between intron/exon

    // assume the first element is a start -> scan from the second element
    // first scan -- aggregate exons and introns
    event_queue.splice(1).forEach(evt => {
        if (evt.type == AlignEventType.Stop) {
            overlappingExons -= 1

            if (overlappingExons === 0) {
                alignment_result_tmp.push({
                    from: previousEventLoc,
                    to: evt.loc,
                    region_type: SplicingRegionType.Exon
                })
                previousEventLoc = evt.loc
            }
        }

        else if (evt.type === AlignEventType.Start) {
            if (overlappingExons === 0) {
                alignment_result_tmp.push({
                    from: previousEventLoc,
                    to: evt.loc,
                    region_type: SplicingRegionType.Intron_show
                })
                previousEventLoc = evt.loc
            }

            overlappingExons += 1
        }
    })

    let totalExonLength = 0
    let totalIntronLength = 0
    let intronRegionCount = 0
    alignment_result_tmp.forEach(region => {
        if (region.region_type === SplicingRegionType.Exon) {
            totalExonLength += (region.to - region.from)
        } else {
            totalIntronLength += (region.to - region.from)
            intronRegionCount += 1
        }
    })

    // let introns take up to 20% screen space -> abbreviate the rest
    const intronsTotalShownLength = totalExonLength * (1 / exonScreenSpace) * intronScreenSpace
    const singleIntronShownLength = intronsTotalShownLength / (intronRegionCount + 1)   // count in half an intron at the beginning and half at the end

    // show a part of an intron before the first exon
    let alignment_result: Array<SplicingAlignmentRegion> = [
        {
            from: Math.floor(alignment_result_tmp[0].from - singleIntronShownLength / 2),
            to: alignment_result_tmp[0].from,
            region_type: SplicingRegionType.Intron_show
        }
    ]

    // abbreviate introns that are too long (leave the beginning and the end)
    alignment_result_tmp.forEach(region => {
        if (region.region_type === SplicingRegionType.Exon) {
            alignment_result.push(region)
        }

        else if ((region.to - region.from) > singleIntronShownLength) {
            alignment_result.push({
                from: region.from,
                to: Math.floor(region.from + singleIntronShownLength/2),
                region_type: SplicingRegionType.Intron_show
            })
            alignment_result.push({
                from: Math.floor(region.from + singleIntronShownLength/2),
                to: Math.ceil(region.to - singleIntronShownLength/2),
                region_type: SplicingRegionType.Intron_skip
            })
            alignment_result.push({
                from: Math.ceil(region.to - singleIntronShownLength/2),
                to: region.to,
                region_type: SplicingRegionType.Intron_show
            })
        }

        else {
            alignment_result.push({
                from: region.from,
                to: region.from,
                region_type: SplicingRegionType.Intron_show
            })
        }
    })

    // show a part of an intron after the last exon
    alignment_result.push({
        from: alignment_result[alignment_result.length - 1].to,
        to: Math.floor(alignment_result[alignment_result.length - 1].to + singleIntronShownLength/2),
        region_type: SplicingRegionType.Intron_show
    })

    return alignment_result
}

/**
 * Returns a screen-space X-coordinate given a genomic location
 * @param dnaLoc Location on the chromosome in base-pairs. Negative number is required when on the reverse strand.
 * @param alignment Alignment object considering all splicing of this gene
 * @param componentWidth Witdh of the component in pixels
 * @returns X-coordinate in pixels
 */
export function getScreenX(dnaLoc: number, alignment: Array<SplicingAlignmentRegion>, componentWidth: number) {
    // get the total length of shown regions in bp
    const totalShownLength = alignment.filter((elem) => elem.region_type === SplicingRegionType.Exon).reduce((accumVariable, elem) => accumVariable + (elem.to - elem.from), 0)

    // factor for conversion from bp to px
    const unitLengthFactor = (componentWidth * exonScreenSpace) / totalShownLength

    let unitsBeforeLoc = 0
    for (let i=0; i < alignment.length; i++) {
        const region = alignment[i]
        if ((dnaLoc >= region.from) && (dnaLoc <= region.to)) {
            if (region.region_type !== SplicingRegionType.Intron_skip) {
                unitsBeforeLoc += (dnaLoc - region.from)
                break
            }

            else {
                console.error('Location ' + dnaLoc + ' matches an abbreviated region')
                return -1   // location in an abbreviated part of an intron
            }
        }

        else if (region.to < dnaLoc) {
            if (region.region_type !== SplicingRegionType.Intron_skip) {
                unitsBeforeLoc += (region.to - region.from)
            }
        }

        else {
            console.error('Location ' + dnaLoc + ' does not fit into the alignment')
            return -1   // this should not happen
        }
    }

    return Math.floor(unitsBeforeLoc * unitLengthFactor)
}

/**
 * Get the screen coordinates of the intron region, accounting for abbreviated parts. There can be multiple abbreviations in a single intron region.
 * @param bpFrom 5'-most coordinate fo the intron
 * @param bpTo 3'-most coordinat of the intron
 * @param alignment alignment object considering all splicing of this gene
 * @param componentWidth witdh of the component in pixels
 * @param skipGapSize length of the abbreviation in pixels
 * @returns an even-length array of line x-coordinates, should be interpreted as [x1, x2, x1, x2, x1, x2, ...]
 */
export function mapIntronCoordinates(bpFrom: number, bpTo: number, alignment: Array<SplicingAlignmentRegion>, componentWidth: number, skipGapSize: number = 6) {
    let result: Array<number> = [ getScreenX(bpFrom, alignment, componentWidth) ]

    alignment.filter(elem => {return (elem.region_type === SplicingRegionType.Intron_skip) && (elem.from > bpFrom) && (elem.to < bpTo)}).forEach(region => {
        result.push(getScreenX(region.from-1, alignment, componentWidth) - Math.floor(skipGapSize / 2))
        result.push(getScreenX(region.to+1, alignment, componentWidth) + Math.floor(skipGapSize / 2))
    })

    result.push(getScreenX(bpTo, alignment, componentWidth))

    return result
}

function DNA_to_RNA(bpLoc: number, exons: Array<Exon>, isReverseStrand: boolean) {
    let RNA_loc = 0

    for (const exon of exons) {
        if (isReverseStrand ? (exon.bp_from > bpLoc) : (exon.bp_to < bpLoc)) {
            RNA_loc += (exon.bp_to - exon.bp_from + 1)
        } else if (isReverseStrand ? (exon.bp_to >= bpLoc) : (exon.bp_from <= bpLoc)) {
            const result = RNA_loc + (isReverseStrand ? (exon.bp_to - bpLoc) : (bpLoc - exon.bp_from))
            return result //RNA_loc + (bpLoc - exon.bp_from)
        }
    }

    return -1
}

function RNA_to_DNA(RNAloc: number, exons: Array<Exon>, isReverseStrand: boolean) {
    let RNALenAcc = 0

    for (const exon of exons) {
        const exonLength = exon.bp_to - exon.bp_from + 1
        if (RNAloc < (RNALenAcc + exonLength)) {
            const result = isReverseStrand ? (exon.bp_to - (RNAloc - RNALenAcc)) : (exon.bp_from + RNAloc - RNALenAcc)
            return result // exon.bp_from + RNAloc - RNALenAcc
        }
        RNALenAcc += exonLength
    }

    return -1
}

/**
 * Maps a span of the RNA sequence to the exon coverage in screen coordinates. 
 * @param rnaFrom Beginning of the region in RNA coordinates (first base of the first exon = 0)
 * @param rnaTo End of the region in RNA coordinates (first base of the first exon = 0)
 * @param alignment alignment object considering all splicing of this gene
 * @param componentWidth witdh of the component in pixels
 * @param exons list of all exons in this particular transcript 
 * @returns An even-length array of line x-coordinates, should be interpreted as [x1, x2, x1, x2, x1, x2, ...]. E.g., if a region starts in exon 1, and ends in exon 3, the resulting array is [region_start, exon1.end, exon2.start, exon2.end, exon3.start, region_end].
 */
function mapRNAToExons(rnaFrom: number, rnaTo: number, exons: Array<Exon>, startCodon: number,  alignment: Array<SplicingAlignmentRegion>, componentWidth: number) {
    let result: Array<number> = []

    let precedingExonLength = 0    

    let bpPoints: Array<number> = []
    let peptideFound = false

    // convert the beginning of the peptide to the DNA location (find the matching exon, locate the codon within the exon)
    for (let currentExonIdx = 0; currentExonIdx < exons.length; currentExonIdx++) {
        const exon = exons[currentExonIdx]
        const exonLength = exon.bp_to - exon.bp_from + 1

        // the beginning of the peptides maps to this exon
        if (!peptideFound && (rnaFrom < precedingExonLength + exonLength)) {
            bpPoints.push(exon.bp_from + rnaFrom - precedingExonLength)
            peptideFound = true

            // the peptide spans over to the next exon
            if (rnaTo >= precedingExonLength + exonLength) {
                bpPoints.push(exon.bp_to - 1)
            }
            // the peptide maps to this exon only
            else {
                bpPoints.push(exon.bp_from + rnaTo - precedingExonLength)
                break
            }
        }
        // we are in the next exon that the peptide covers
        else if (peptideFound) {
            bpPoints.push(exon.bp_from)

            // the peptide spans over to the next exon
            if (rnaTo >= precedingExonLength + exonLength) {
                bpPoints.push(exon.bp_to - 1)
            }
            // the peptide end maps to this exon
            else {
                bpPoints.push(exon.bp_from + rnaTo - precedingExonLength)
                break
            }
        }

        precedingExonLength += exonLength
    }

    result = bpPoints.map(bp => getScreenX(bp, alignment, componentWidth))
    return result
}

function overlayExonAlignment(exon_regions: Array<Array<number>>, overlay_regions: Array<Array<Array<number>>>, colours: Array<string>) {
    interface ExonAligned {
        x: number,
        width: number,
        color_hex: string
    }

    interface RegionEvent {
        x: number,
        is_start: boolean,
        priority: number
    }

    let regionEvents: Array<RegionEvent> = []
    overlay_regions.forEach( (layer, i) => {
        for (const reg of layer) {
            regionEvents.push({
                x: reg[0],
                is_start: true,
                priority: i
            })
            regionEvents.push({
                x: reg[1],
                is_start: false,
                priority: i
            })
        }
    })
    regionEvents.sort((a,b) => {
        if (a.x === b.x) {
            return a.is_start ? 1 : -1
        }
        return a.x - b.x
    })

    let overlayPosition = 0
    const defaultColour = "#e0e0e0"
    let currentColour = defaultColour
    let currentPriority = [-1]
    let exonData: Array<ExonAligned> = []

    // browse the exons in screen space left to right, see where the changes in overlays occur
    exon_regions.forEach((exon, exon_idx) => {

        let lastX = exon[0]     // the X coordinate where the next rectangle begins

        // process overlay regions that begin or end in this exon
        while ((overlayPosition < regionEvents.length) && (regionEvents[overlayPosition].x <= exon[1])){

            // the next event is a start of a region
            if (regionEvents[overlayPosition].is_start) {
                // the order of the current region before the event
                const previousPriority = Math.max(...currentPriority)

                currentPriority.push(regionEvents[overlayPosition].priority)
                overlayPosition++

                // other overlay regions that begin at the same location
                while ((overlayPosition < regionEvents.length) && regionEvents[overlayPosition].is_start && (regionEvents[overlayPosition].x === regionEvents[overlayPosition-1].x)) {
                    currentPriority.push(regionEvents[overlayPosition].priority)
                    overlayPosition++
                }

                // the order of the region aofer the event
                const newPriority = Math.max(...currentPriority)

                // if the order increased, draw the region until here and remember new location
                if (previousPriority < newPriority) {
                    exonData.push({
                        x: lastX,
                        color_hex: currentColour,
                        width: regionEvents[overlayPosition-1].x - lastX,
                    })

                    currentColour = colours[newPriority]
                    lastX = regionEvents[overlayPosition-1].x
                }

            // the next event is an end of a region
            } else {
                // the order of the current region before the event
                const previousPriority = Math.max(...currentPriority)

                currentPriority.splice(currentPriority.indexOf(regionEvents[overlayPosition].priority), 1)
                overlayPosition++

                // other overlay regions that end at the same location
                while ((overlayPosition < regionEvents.length) && !regionEvents[overlayPosition].is_start && (regionEvents[overlayPosition].x === regionEvents[overlayPosition-1].x)) {
                    currentPriority.splice(currentPriority.indexOf(regionEvents[overlayPosition].priority), 1)
                    overlayPosition++
                }

                // the order of the region aofer the event
                const newPriority = Math.max(...currentPriority)

                // if the order decreased, draw the region until here and remember new location
                if (previousPriority > newPriority) {
                    exonData.push({
                        x: lastX,
                        color_hex: currentColour,
                        width: regionEvents[overlayPosition-1].x - lastX,
                    })

                    currentColour = newPriority > -1 ? colours[newPriority]: defaultColour
                    lastX = regionEvents[overlayPosition-1].x
                }
            }
        }

        // draw the remainder of the exon
        if (lastX < exon[1]) {
            exonData.push({
                x: lastX,
                color_hex: currentColour,
                width: exon[1] - lastX,
            })

            // remove overlay regions that end before the next exon
            while ((overlayPosition < regionEvents.length) && !regionEvents[overlayPosition].is_start && ((exon_idx >= (exon_regions.length-1)) || (regionEvents[overlayPosition].x < exon_regions[exon_idx+1][0]))) {
                currentPriority.splice(currentPriority.indexOf(regionEvents[overlayPosition].priority), 1)
                overlayPosition++
            }
            const newPriority = Math.max(...currentPriority)
            currentColour = newPriority > -1 ? colours[newPriority]: defaultColour
        }
    })

    return exonData
}

export function alignPeptidesExons(peptides: Array<Array<number>>, exons: Array<Exon>, DNAStartPos: number, xStartPos: number, xStopPos: number, strand_factor: number, componentWidth: number, textWidth: number,  alignment: Array<SplicingAlignmentRegion>) {
    // intron coordinates
    let alignedIntrons: Array<number> = []  
    let alignedExons: Array<Array<number>> = []
    const RNAStartPos = DNA_to_RNA(DNAStartPos, exons, strand_factor === -1)
    const peptidesRNA = peptides.map(pept => pept.map(proteinLoc => ((3 * proteinLoc) + RNAStartPos)))
    const peptidesDNA = peptidesRNA.map(pept => pept.map(RNAloc => RNA_to_DNA(RNAloc, exons, strand_factor === -1)))
    let alignedPeptides = peptidesDNA.map(pept => pept.map(DNAloc => getScreenX( strand_factor * DNAloc, alignment, componentWidth - textWidth)))
    alignedPeptides = alignedPeptides.map(pept => [pept[0], pept[1] + 2])

    exons.sort((a, b) => strand_factor === 1 ? (a.bp_from - b.bp_from) : (b.bp_to - a.bp_to)).forEach((exon, idx) => {
        let xFrom: number, xTo: number

        if (strand_factor === 1) {
            xFrom = getScreenX(exon.bp_from, alignment, componentWidth - textWidth)
            xTo = getScreenX(exon.bp_to, alignment, componentWidth - textWidth)

            if (idx === 0) {
                alignedIntrons = mapIntronCoordinates(alignment[0].from, exon.bp_from, alignment, componentWidth - textWidth) // first intron
            }

            if (idx < (exons.length - 1)) {
                const alignedIntron = mapIntronCoordinates(exon.bp_to, exons[idx + 1].bp_from, alignment, componentWidth - textWidth)
                alignedIntrons = [...alignedIntrons, ...alignedIntron]
            }

            else {
                const alignedIntron = mapIntronCoordinates(exon.bp_to, alignment[alignment.length - 1].to, alignment, componentWidth - textWidth)
                alignedIntrons = [...alignedIntrons, ...alignedIntron]
            }
        }                
        else {  // reverse strand -> flip start and end of the exon, negate location
            xFrom = getScreenX(-exon.bp_to, alignment, componentWidth - textWidth)
            xTo = getScreenX(-exon.bp_from, alignment, componentWidth - textWidth)

            if (idx === 0) {
                alignedIntrons = mapIntronCoordinates(alignment[0].from, -exon.bp_to, alignment, componentWidth - textWidth) // first intron
            }

            if (idx < (exons.length - 1)) {
                const alignedIntron = mapIntronCoordinates(-exon.bp_from, exons[idx + 1].bp_to, alignment, componentWidth - textWidth)
                alignedIntrons = [...alignedIntrons, ...alignedIntron]
            }

            else {
                const alignedIntron = mapIntronCoordinates(-exon.bp_from, alignment[alignment.length - 1].to, alignment, componentWidth - textWidth)
                alignedIntrons = [...alignedIntrons, ...alignedIntron]
            }
        }

        alignedExons.push([xFrom, xTo])
    })

    const exonData = overlayExonAlignment(alignedExons, [[[xStartPos, xStopPos]], alignedPeptides], ["#c9c9c9", "#00589c"])

    return { 'exons': exonData, 'introns': alignedIntrons }
}

/**
 * Get the screen coordinate from a DNA location aligned with the exons, ignoring all intron regions (i.e., introns are completely hidden)
 * @param exons Array of Exon objects, no ordering required
 * @param dna_loc DNA location to be mapped
 * @param total_cdna_length total length of the cDNA sequence
 * @param component_width total width of the parent component in pixels
 * @param forward_strand boolean - is the gene located on the forward strand?
 * @returns screen location in pixels
 */
export function getScreenX_simple(exons: Array<Exon>, dna_loc: number, total_cdna_length: number, component_width: number, forward_strand: boolean): number {
    let cDNA_loc = 0
    const sorted_exons = exons.sort((a,b) => { return forward_strand ? a.bp_from - b.bp_from : b.bp_to - a.bp_to })

    for (let exon_idx=0; exon_idx < sorted_exons.length; exon_idx++) {
        if (forward_strand) {
            if (dna_loc > sorted_exons[exon_idx].bp_to) {
                cDNA_loc += sorted_exons[exon_idx].bp_to - sorted_exons[exon_idx].bp_from + 1
            } else if ((dna_loc >= sorted_exons[exon_idx].bp_from) && (dna_loc <= sorted_exons[exon_idx].bp_to)) {
                cDNA_loc += dna_loc - sorted_exons[exon_idx].bp_from
                break
            } else {
                cDNA_loc = -1 
                break
            }
        } else {    // reverse strand -> scanning backwards
            if (dna_loc < sorted_exons[exon_idx].bp_from) {
                cDNA_loc += sorted_exons[exon_idx].bp_to - sorted_exons[exon_idx].bp_from + 1
            } else if ((dna_loc >= sorted_exons[exon_idx].bp_from) && (dna_loc <= sorted_exons[exon_idx].bp_to)) {
                cDNA_loc += sorted_exons[exon_idx].bp_to - dna_loc
                break
            } else {
                cDNA_loc = -1 
                break
            }
        }
    }

    return cDNA_loc === -1 ? -1 : Math.floor((cDNA_loc / total_cdna_length) * component_width)
}