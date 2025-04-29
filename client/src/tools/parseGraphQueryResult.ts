import type { Gene, Exon, Transcript, Variant, Haplotype, Proteoform, Peptide, Spectrum, Sample } from '../types/graph_nodes'
import { VariantType } from '../types/graph_nodes'
import { findLeftIndex } from './binarySearch'

interface Neo4jRelationship {
    start: any, // start node object
    end: any,   // end node object
    id: string,
    label: string,
    type: string,
    properties?: any
}

export function parseOverview(queryResult: any[]): Array<Gene> {
    let parsedResult: Array<Gene> = [];

    if (queryResult.length > 0) {
        parsedResult = queryResult.map(gene_node => {
            return {
                id: gene_node.id,
                gene_biotype: gene_node.biotype,
                gene_name: gene_node.name,
                gene_version: gene_node.version,
                bp_from: gene_node.bp_from,
                bp_to: gene_node.bp_to,
                strand: gene_node.strand,
                chrom: gene_node.chrom,
                _matched_vars: gene_node.matched_vars,
                _total_proteoforms: gene_node.total_proteoforms,
                _total_peptides: gene_node.total_peptides,
                _variant_peptides: gene_node.variant_peptides,
            } as Gene
        })
    }

    return parsedResult
}

function createTranscript(node: any): Transcript {
    return {
            id: node.properties.id,
            transcript_biotype: node.properties.biotype,
            transcript_version: node.properties.version,
            cDNA_sequence: node.properties.cDNA_sequence,
            ensembl_canonical: node.properties.ensembl_canonical,
            MANE_select: node.properties.MANE_select,
            exons: [],
            haplotypes: [],
            proteoforms: [],
            transcript_hap_freqs: [],
            canonical_protein: undefined as any,   // just a placeholder, the actual value will be added below
            start: node.properties.start,
            stop: node.properties.stop
        }
}

function createVariant(node: any): Variant {
    const len_diff = node.properties.ref.length - node.properties.alt.length 
    return {
        id: node.properties.id,
        location_bp: parseInt(node.properties.location),
        ref: node.properties.ref,
        alt: node.properties.alt,
        found: node.properties.overlapping_peptide,
        type: len_diff === 0 ? VariantType.SNP : (len_diff % 3) === 0 ? VariantType.inframe_indel : VariantType.frameshift
    }
}

function createExon(node: any): Exon {
    return {
        id: node.properties.id,
        bp_from: parseInt(node.properties.bp_from),
        bp_to: parseInt(node.properties.bp_to)
    }
}

function createHaplotype(node: any): Haplotype {
    return {
        id: node.properties.id,
        included_variants: [],
        matching_transcripts: []
    }
}

function createProteoform(node: any): Proteoform {
    const affected_splice_sites = node.properties.splice_sites_affected === '-' ? [] : node.properties.splice_sites_affected.split(';').map((elem: string) => parseInt(elem))
    return {
        id: node.properties.id,
        length: node.properties.length,
        sequence: node.properties.sequence,
        cDNA_changes: node.properties.cDNA_changes,
        protein_changes: node.properties.protein_changes,
        start_aa: node.properties.start_aa,
        reading_frame: node.properties.reading_frame,
        splice_sites_affected: affected_splice_sites,
        transcript: undefined as any,     // just a placeholder, the actual value will be added when parsing the graph edges
        haplotype: undefined,
        matching_peptides: [],
        matching_peptide_positions: []
    }
}

function createPeptide(node: any): Peptide {
    return {
        id: node.properties.id,
        length: node.properties.length,
        sequence: node.properties.sequence,
        class_1: node.properties.pep_class_1,
        class_2: node.properties.pep_class_2,
        matching_spectra: [],       // keep these arrays sorted by PEP from best to worst
        PSM_PEP: [],
        PSM_q_vals: [],
        PSM_RT_errors: [],
        PSM_spec_simil: [],
        matching_gene_names: [],
        matching_gene_ids: [],
        matching_transcript_ids: []
    }
}

function createSpectrum(node: any): Spectrum {
    return {
        id: node.properties.id,
        spec_title: node.properties.title,
        precursor_mz: node.properties.precursor_mz,
        precursor_intensity: node.properties.precursor_intensity,
        fragment_technique: node.properties.frag_technique,
        proteases: node.properties.proteases,
        retention_time: node.properties.retention_time,
        spectrometer: node.properties.spectrometer,
        USI: "",                  // just a placeholder, the actual value will be added when parsing the graph edges
        sample: undefined as any, // just a placeholder, the actual value will be added when parsing the graph edges
        fraction_id: node.properties.fraction_id
    }
}

function createSample(node: any): Sample {
    return {
        id: node.properties.id,
        tissue: node.properties.tissue_name,
        indiv_age: node.properties.individual_age,
        indiv_sex: node.properties.individual_sex,
        phenotype: node.properties.phenotype,
        pride_accession: node.properties.pride_project_accession
    }
}

export function parseGeneSubgraph(queryResult: any[]): Array<Gene> {
    let parsedResult: Array<Gene> = [];

    // every gene that matches the search result produces its own subtree
    // -> parse each subtree into the objects as defined above
    queryResult.forEach((subtree_str) => {
        const subtree = JSON.parse(subtree_str.relationships)
        const gene_node = subtree.find((rel: Neo4jRelationship) => (rel.label === 'TRANSCRIPT_OF')).end

        let root: Gene = {
            id: gene_node.properties.id,
            gene_biotype: gene_node.properties.biotype,
            gene_name: gene_node.properties.name,
            gene_version: gene_node.properties.version,
            bp_from: gene_node.properties.bp_from,
            bp_to: gene_node.properties.bp_to,
            strand: gene_node.properties.strand,
            chrom: gene_node.properties.chrom,
            transcripts: [],
            variants: []
        }

        let exons: { [id: string] : Exon } = {}
        let variants: { [id: string] : Variant } = {}
        let transcripts: { [id: string] : Transcript } = {}
        let haplotypes: { [id: string] : Haplotype } = {}
        let proteoforms: { [id: string] : Proteoform } = {}
        let peptides: { [id: string] : Peptide } = {}

        subtree.forEach((rel: Neo4jRelationship) => {
            switch (rel.label) {

                case 'TRANSCRIPT_OF': {
                    let transcript: Transcript;
                    if (!(rel.start.id in transcripts)) {
                        transcript = createTranscript(rel.start)
                        transcripts[rel.start.id] = transcript
                    } else {
                        transcript = transcripts[rel.start.id]
                    }

                    root.transcripts.push(transcript);
                    break;
                }

                case 'VARIANT_MAPS_TO': {
                    let variant: Variant;
                    if (!(rel.start.id in variants)) {
                        variant = createVariant(rel.start)
                        variants[rel.start.id] = variant
                    } else {
                        variant = variants[rel.start.id]
                    }
                    
                    root.variants.push(variant)
                    break
                }

                case 'INCLUDES_EXON': {
                    let transcript: Transcript;
                    if (!(rel.start.id in transcripts)) {
                        transcript = createTranscript(rel.start)
                        transcripts[rel.start.id] = transcript
                    } else {
                        transcript = transcripts[rel.start.id]
                    }
                    
                    let exon: Exon;
                    if (!(rel.end.id in exons)) {
                        exon = createExon(rel.end)
                        exons[rel.end.id] = exon
                    } else {
                        exon = exons[rel.end.id]
                    }

                    transcript.exons.push(exon)
                    break;
                }

                case 'INCLUDES_ALT_ALLELE': {
                    let haplotype: Haplotype; 
                    if (!(rel.start.id in haplotypes)) {
                        haplotype = createHaplotype(rel.start)
                        haplotypes[rel.start.id] = haplotype
                    } else {
                        haplotype = haplotypes[rel.start.id]
                    }

                    let variant: Variant;
                    if(!(rel.end.id in variants)) {
                        variant = createVariant(rel.end)
                        variants[rel.end.id] = variant
                    } else {
                        variant = variants[rel.end.id]
                    }

                    const order = rel.properties!.var_order

                    // the list of variant objects in the haplotype needs to be sorted according to the order in the protein sequence 
                    // (stored in the relationship prop in Neo4j)

                    const already_added = haplotype.included_variants.length
                    // E.g., we want to add the 3rd variant, but the 1st and 2nd haven't been added yet 
                    // -> create a placeholder for the preceding variants before adding the 3rd
                    if (order > already_added) {
                        for (let i=0; i < (order - already_added); i++) {
                            haplotype.included_variants.push(undefined as any)
                        }
                    }

                    haplotype.included_variants.splice(order,1,variant)                    
                    break;
                }

                case 'HAPLO_FORM_OF': {
                    let haplotype: Haplotype; 
                    if (!(rel.start.id in haplotypes)) {
                        haplotype = createHaplotype(rel.start)
                        haplotypes[rel.start.id] = haplotype
                    } else {
                        haplotype = haplotypes[rel.start.id]
                    }
                    
                    let transcript: Transcript;
                    if (!(rel.end.id in transcripts)) {
                        transcript = createTranscript(rel.end)
                        transcripts[rel.end.id] = transcript
                    } else {
                        transcript = transcripts[rel.end.id]
                    }

                    const freq = rel.properties!.frequency

                    haplotype.matching_transcripts.push(transcript)
                    transcript.haplotypes.push(haplotype)
                    transcript.transcript_hap_freqs.push(freq)
                    break;
                }

                case 'ENCODED_BY_HAPLOTYPE': {
                    let proteoform: Proteoform;
                    if (!(rel.start.id in proteoforms)) {
                        proteoform = createProteoform(rel.start)
                        proteoforms[rel.start.id] = proteoform
                    } else {
                        proteoform = proteoforms[rel.start.id]
                    }
                    
                    let haplotype: Haplotype; 
                    if (!(rel.end.id in haplotypes)) {
                        haplotype = createHaplotype(rel.end)
                        haplotypes[rel.end.id] = haplotype
                    } else {
                        haplotype = haplotypes[rel.end.id]
                    }

                    proteoform.haplotype = haplotype
                    break;
                }

                case 'ENCODED_BY_TRANSCRIPT': {                    
                    let proteoform: Proteoform;
                    if (!(rel.start.id in proteoforms)) {
                        proteoform = createProteoform(rel.start)
                        proteoforms[rel.start.id] = proteoform
                    } else {
                        proteoform = proteoforms[rel.start.id]
                    }
                    
                    let transcript: Transcript;
                    if (!(rel.end.id in transcripts)) {
                        transcript = createTranscript(rel.end)
                        transcripts[rel.end.id] = transcript
                    } else {
                        transcript = transcripts[rel.end.id]
                    }

                    proteoform.transcript = transcript
                    transcript.proteoforms.push(proteoform)

                    break;
                }
                
                case 'MAPS_TO': {                
                    let peptide: Peptide;
                    if (!(rel.start.id in peptides)) {
                        peptide = createPeptide(rel.start)
                        peptides[rel.start.id] = peptide
                    } else {
                        peptide = peptides[rel.start.id]
                    }

                    let proteoform: Proteoform;
                    if (!(rel.end.id in proteoforms)) {
                        proteoform = createProteoform(rel.end)
                        proteoforms[rel.end.id] = proteoform
                    } else {
                        proteoform = proteoforms[rel.end.id]
                    }

                    const pos = rel.properties!.position
                    
                    proteoform.matching_peptides.push(peptide)
                    proteoform.matching_peptide_positions.push(pos)
                    break
                }
            }
        });

        // assign the canonical proteoform to each transcript
        // this has to be done after parsing the graph edges to ensure all the noncanonical proteoforms have an assigned haplotype
        for (const trID in transcripts) {
            let transcript = transcripts[trID]

            for (const proteoform of transcript.proteoforms) {
                // canonical proteoform has no haplotype object - should be only one per transcript
                if (!proteoform.haplotype) {
                    transcript.canonical_protein = proteoform
                }
            }
        }

        // temp. solution - remove missing variants (undefined) from haplotypes
        for (const haploID in haplotypes) {
            let haplotype = haplotypes[haploID]
            haplotype.included_variants = haplotype.included_variants.filter(elem => elem)
        }

        parsedResult.push(root)
    })

    return parsedResult
}

/**
 * Attach reference peptides to regions of the protein haplotype where variation does not occur. By default, canonical peptides do not have an edge to non-canonical proteoforms to save space in the graph database.
 * @param haplo_proteoform 
 * @param ref_proteoform 
 * @returns 
 */
export function addCanonicalPSMs(haplo_proteoform: Proteoform, ref_proteoform: Proteoform): Proteoform {
    if (!ref_proteoform.matching_peptides) {
        return haplo_proteoform
    }

    const nonsynonynmous_changes = haplo_proteoform.protein_changes.split(';').map((ch) => {
        if (ch.split(':')[1].split('>')[0] == ch.split(':')[2].split('(')[0]) {
            return [0,0,0]  // ignore synonymous SNPs
        }

        const from = Number.parseInt(ch.split(':')[0])
        const to = from + ch.split(':')[2].split('(')[0].length
        const isFS = (ch.endsWith('(+fs)') && (to >= 0)) ? 1 : 0

        return [from, to, isFS]
    })

    ref_proteoform.matching_peptide_positions.forEach((pep_from, i) => {
        const pep_to = pep_from + ref_proteoform.matching_peptides[i].length
        const overlapping_changes = nonsynonynmous_changes.filter(ch => {
            return ((ch[0] <= pep_to) && (ch[2] || ((ch[0] >= pep_from) && (ch[1] < pep_to))))
        })

        if (overlapping_changes.length == 0) {
            haplo_proteoform.matching_peptides.push(ref_proteoform.matching_peptides![i])
            haplo_proteoform.matching_peptide_positions.push(pep_from + haplo_proteoform.start_aa)
        }
    })

    return haplo_proteoform
}

export function parseProteoformSubgraph(queryResult: any[], proteoform: Proteoform):  [Proteoform, Array<Peptide>] {
    let parsedResult: Array<Peptide> = [];

    proteoform.matching_peptides = []
    proteoform.matching_peptide_positions = []

    // every proteoform that matches the search result produces its own subtree
    // -> parse each subtree into the objects as defined above (there should be just one)
    queryResult.forEach((subtree_str) => {
        const subtree = JSON.parse(subtree_str.relationships)
        const peptide_node = subtree.find((rel: Neo4jRelationship) => (rel.label === 'MAPS_TO')).start

        let root: Peptide = createPeptide(peptide_node)

        let spectra: { [id: string] : Spectrum } = {}
        let samples: { [id: string] : Sample } = {}

        // create and connect nodes
        subtree.forEach((rel: Neo4jRelationship) => {
            switch (rel.label) {
                case 'MAPS_TO': {
                    if (rel.end.properties.id === proteoform.id) {                 
                        const pos = rel.properties.position
                        
                        proteoform.matching_peptides!.push(root)
                        proteoform.matching_peptide_positions!.push(pos)
                    }   
                    break
                }

                case 'MATCHED_TO': {
                    const peptide = root

                    let spectrum: Spectrum;
                    if (!(rel.end.id in spectra)) {
                        spectrum = createSpectrum(rel.end)
                        spectra[rel.end.id] = spectrum
                    } else {
                        spectrum = spectra[rel.end.id]
                    }

                    const q_val = rel.properties.q_value
                    const PEP = rel.properties.posterior_error_probability
                    const RT_err = rel.properties.rt_Abs_error
                    const spec_simil = rel.properties.spectra_angular_similarity
                    const USI = rel.properties.USI

                    let index = 0   // position at which to insert the next PSM ordered by the PEP from lowest to highest

                    if (peptide.matching_spectra.length > 1) {
                        index = findLeftIndex(peptide.PSM_PEP, PEP)
                    } else if (peptide.matching_spectra.length == 1) {
                        index = (PEP < peptide!.PSM_PEP[0]) ? 0 : 1
                    }

                    peptide.matching_spectra.splice(index, 0, spectrum)
                    peptide.PSM_q_vals.splice(index, 0, q_val)
                    peptide.PSM_PEP.splice(index, 0, PEP)
                    peptide.PSM_RT_errors.splice(index, 0, RT_err)
                    peptide.PSM_spec_simil.splice(index, 0, spec_simil)

                    // assuming only one PSM per spectrum
                    spectrum.USI = USI
                    break
                }

                case 'MEASURED_FROM': {
                    let spectrum: Spectrum;
                    if (!(rel.start.id in spectra)) {
                        spectrum = createSpectrum(rel.start)
                        spectra[rel.start.id] = spectrum
                    } else {
                        spectrum = spectra[rel.start.id]
                    }

                    let sample: Sample;
                    if (!(rel.end.id in samples)) {
                        sample = createSample(rel.end)
                        samples[rel.end.id] = sample
                    } else {
                        sample = samples[rel.end.id]
                    }

                    spectrum.sample = sample
                    break
                }

                case 'ENCODED_BY_TRANSCRIPT': {
                    root.matching_transcript_ids!.push(rel.end.properties.id)
                    break
                }

                case 'TRANSCRIPT_OF': {                    
                    root.matching_gene_ids!.push(rel.end.properties.id)
                    root.matching_gene_names!.push((rel.end.properties.name === '-') ? rel.end.properties.id : rel.end.properties.name)
                }
            }
        })

        parsedResult.push(root)
    });
    
    return [proteoform, parsedResult]
}