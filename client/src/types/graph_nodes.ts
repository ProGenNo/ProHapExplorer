export interface Gene {
    id: string,
    gene_name: string,
    gene_version: number,
    gene_biotype: string,
    bp_from: number,
    bp_to: number,
    strand: string,
    chrom: string,
    transcripts: Array<Transcript>,
    variants: Array<Variant>
}

export interface Exon {
    id: string,
    bp_from: number,
    bp_to: number
}

export enum VariantType {
    SNP = 0,
    inframe_indel = 1,
    frameshift = 2
}

export interface Variant {
    id: string,
    location_bp: number,
    ref: string,
    alt: string,
    type: VariantType
}

export interface Transcript {
    id: string,
    transcript_version: number,
    transcript_biotype: string,
    cDNA_sequence: string,
    ensembl_canonical: boolean,
    MANE_select: boolean,
    start: Array<number>,
    stop: Array<number>,
    exons: Array<Exon>,
    haplotypes: Array<Haplotype>,
    proteoforms: Array<Proteoform>,
    canonical_protein: Proteoform,
    transcript_hap_freqs: Array<number>
}

export interface Haplotype {
    id: string,
    included_variants: Array<Variant>,
    matching_transcripts: Array<Transcript>,
    matching_proteoform?: Proteoform,
    frequency?: number,
    UTR5_protein?: string[],
    UTR5_cDNA?: string[],
    UTR3_protein?: string[],
    UTR3_cDNA?: string[],
    coding_protein?: string[],
    coding_cDNA?: string[],
    synonymous_cDNA?: string[]
}

export interface Proteoform {
    id: string,
    length: number,
    sequence: string,
    reading_frame: number,
    protein_changes: string,
    cDNA_changes: string,
    start_aa: number,
    splice_sites_affected: Array<number>,
    transcript: Transcript,
    haplotype?: Haplotype,
    matching_peptides?: Array<Peptide>,
    matching_peptide_positions?: Array<number>,
}

export interface Peptide {
    id: string,
    length: number,
    class_1: string,
    class_2: string,
    sequence: string,
    matching_spectra: Array<Spectrum>,
    PSM_q_vals: Array<number>,
    PSM_PEP: Array<number>,
    PSM_RT_errors: Array<number>,
    PSM_spec_simil: Array<number>,
    position? : number
}

export interface Spectrum {
    id: string,
    spec_title: string,
    fraction_id?: string,
    fragment_technique: string,
    precursor_mz: number,
    precursor_intensity: number,
    retention_time: number,
    proteases: string,
    spectrometer: string,
    sample: Sample
}

export interface Sample {
    id: string,
    indiv_age: number,
    indiv_sex: string,
    pride_accession: string,
    tissue: string,
    phenotype: string
}