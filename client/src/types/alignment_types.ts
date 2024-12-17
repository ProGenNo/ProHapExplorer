export enum SplicingRegionType {
    Exon = 0,
    Intron_show = 1,
    Intron_skip = 2
}

export interface SplicingAlignmentRegion {
    region_type: SplicingRegionType,
    from: number,
    to: number
}

export enum ProteinRegionType {
    UTR_5 = 0,
    mORF = 1,
    UTR_3 = 2
}

export interface AlignedSequenceSegment {
    ref_cDNA: string,
    alt_cDNA: string,
    ref_protein: string,
    alt_protein: string,
    ref_loc: number,
    bp_from: number,
    bp_to: number,
    type: ProteinRegionType
}

export interface Alignment {
    ref_cDNA: string,
    alt_cDNA: string,
    ref_protein: string,
    alt_protein: string,
    segments: Array<AlignedSequenceSegment>
}

export interface PSMAlignment {
    aa_pos: number[],
    PSM_count_groupwise: number[][],
    PSM_group_names: string[],
    PSM_group_colours: string[],
    PSM_count_total: number[]
}

export interface AlignedPeptide {
    aa_pos: number,
    length: number,
    y_offset: number,
    colour: string
}