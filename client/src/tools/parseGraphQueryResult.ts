import type { Gene, Exon, Transcript, Variant, Haplotype, Proteoform, Peptide, Spectrum, Sample } from '../types/graph_nodes'
import { VariantType } from '../types/graph_nodes'

export function parseGeneSubgraph(queryResult): Array<Gene> {
    let parsedResult: Array<Gene> = [];

    // every gene that matches the search result produces its own subtree
    // -> parse each subtree into the objects as defined above
    queryResult.forEach((subtree) => {
        const gene_node = subtree.nodes[0]
        const remaining_nodes = subtree.nodes.slice(1)
        const node_types = subtree.node_types.slice(1)
        const relationship_props = subtree.rel_props

        let root: Gene = {
            id: gene_node.id,
            gene_biotype: gene_node.biotype,
            gene_name: gene_node.name,
            gene_version: gene_node.version,
            bp_from: gene_node.bp_from,
            bp_to: gene_node.bp_to,
            strand: gene_node.strand,
            chrom: gene_node.chrom,
            transcripts: [],
            variants: []
        }

        let exons: Array<Exon> = []
        let variants: Array<Variant> = []
        let transcripts: Array<Transcript> = []
        let haplotypes: Array<Haplotype> = []
        let proteoforms: Array<Proteoform> = []
        let peptides: Array<Peptide> = []

        // create the node objects
        remaining_nodes.forEach((node, idx) => {
            const node_type = node_types[idx][0];
            switch (node_type) {
                case ("Exon"):
                    exons.push({
                        id: node.id,
                        bp_from: node.bp_from,
                        bp_to: node.bp_to
                    });
                    break;
                case ("Variant"):
                    const len_diff = node.ref.length - node.alt.length 
                    variants.push({
                        id: node.id,
                        location_bp: node.location,
                        ref: node.ref,
                        alt: node.alt,
                        type: len_diff === 0 ? VariantType.SNP : (len_diff % 3) === 0 ? VariantType.inframe_indel : VariantType.frameshift
                    })
                    break;
                case ("Transcript"): 
                    transcripts.push({
                        id: node.id,
                        transcript_biotype: node.biotype,
                        transcript_version: node.version,
                        cDNA_sequence: node.cDNA_sequence,
                        ensembl_canonical: node.ensembl_canonical,
                        MANE_select: node.MANE_select,
                        exons: [],
                        haplotypes: [],
                        proteoforms: [],
                        transcript_hap_freqs: [],
                        canonical_protein: undefined,
                        start: node.start,
                        stop: node.stop
                    })
                    break;
                case ("Haplotype"):
                    haplotypes.push({
                        id: node.id,
                        included_variants: [],
                        matching_transcripts: []
                    })
                    break;
                case ("Proteoform"):
                    const affected_splice_sites =  node.splice_sites_affected === '-' ? [] : node.splice_sites_affected.split(';').map((elem: string) => parseInt(elem))
                    proteoforms.push({
                        id: node.id,
                        length: node.length,
                        sequence: node.sequence,
                        cDNA_changes: node.cDNA_changes,
                        protein_changes: node.protein_changes,
                        start_aa: node.start_aa,
                        reading_frame: node.reading_frame,
                        splice_sites_affected: affected_splice_sites,
                        transcript: undefined,
                        haplotype: undefined,
                        matching_peptides: [],
                        matching_peptide_positions: []
                    })
                    break;
                case ("Peptide"):
                    peptides.push({
                        id: node.id,
                        length: node.length,
                        sequence: node.sequence,
                        class_1: node.pep_class_1,
                        class_2: node.pep_class_2,
                        matching_spectra: [],
                        PSM_PEP: [],
                        PSM_q_vals: [],
                        PSM_RT_errors: [],
                        PSM_spec_simil: []
                    })
            }
        });

        // connect the nodes (create edges)
        subtree.relationships.forEach((edge, idx) => {
            switch (edge[1]) {

                case 'TRANSCRIPT_OF': {
                    const transcript = transcripts.find((elem) => elem.id === edge[0].id)
                    root.transcripts.push(transcript);
                    break;
                }

                case 'VARIANT_MAPS_TO': {
                    const variant = variants.find((elem) => elem.id === edge[0].id)
                    root.variants.push(variant)
                    break
                }

                case 'INCLUDES_EXON': {
                    const transcript = transcripts.find((elem) => elem.id === edge[0].id)
                    const exon = exons.find((elem) => elem.id === edge[2].id)
                    transcript.exons.push(exon)
                    break;
                }

                case 'INCLUDES_ALT_ALLELE': {
                    const haplotype = haplotypes.find((elem) => elem.id === edge[0].id)
                    const variant = variants.find((elem) => elem.id === edge[2].id)
                    haplotype.included_variants.push(variant)
                    break;
                }

                case 'HAPLO_FORM_OF': {
                    const haplotype = haplotypes.find((elem) => elem.id === edge[0].id)
                    const transcript = transcripts.find((elem) => elem.id === edge[2].id)
                    const freq = relationship_props[idx].frequency

                    haplotype.matching_transcripts.push(transcript)
                    transcript.haplotypes.push(haplotype)
                    transcript.transcript_hap_freqs.push(freq)
                    break;
                }

                case 'ENCODED_BY_HAPLOTYPE': {
                    const proteoform = proteoforms.find(elem => elem.id === edge[0].id)
                    const haplotype = haplotypes.find(elem => elem.id === edge[2].id)

                    proteoform.haplotype = haplotype
                    break;
                }

                case 'ENCODED_BY_TRANSCRIPT': {
                    const proteoform = proteoforms.find(elem => elem.id === edge[0].id)
                    const transcript = transcripts.find(elem => elem.id === edge[2].id)

                    proteoform.transcript = transcript
                    break;
                }
                
                case 'MAPS_TO': {                
                    const peptide = peptides.find((elem) => elem.id === edge[0].id)
                    const proteoform = proteoforms.find(elem => elem.id === edge[2].id)    
                    const pos = relationship_props[idx].position
                    
                    proteoform.matching_peptides.push(peptide)
                    proteoform.matching_peptide_positions.push(pos)
                    break
                }
            }
        });

        transcripts.forEach((transcript) => {
            const matching_proteoforms = proteoforms.filter(proteoform => proteoform.transcript === transcript)
            transcript.haplotypes.forEach((haplotype, idx) => {
                transcript.proteoforms.push(matching_proteoforms.find(proteoform => proteoform.haplotype === haplotype))
            })

            transcript.canonical_protein = matching_proteoforms.find(proteoform => !proteoform.haplotype)
        })

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
        const isFS = (ch.endsWith('(+fs)') && (to >= haplo_proteoform.start_aa)) ? 1 : 0

        return [from, to, isFS]
    })

    ref_proteoform.matching_peptide_positions.forEach((pep_from, i) => {
        const pep_to = pep_from + ref_proteoform.matching_peptides[i].length
        const overlapping_changes = nonsynonynmous_changes.filter(ch => {
            return ((ch[0] <= pep_to) && (ch[2] || ((ch[0] >= pep_from) && (ch[1] < pep_to))))
        })

        if (overlapping_changes.length == 0) {
            haplo_proteoform.matching_peptides.push(ref_proteoform.matching_peptides[i])
            haplo_proteoform.matching_peptide_positions.push(pep_from + haplo_proteoform.start_aa)
        }
    })

    return haplo_proteoform
}

export function parseProteoformSubgraph(queryResult):  Array<Proteoform> {
    let parsedResult: Array<Proteoform> = [];

    // every gene that matches the search result produces its own subtree
    // -> parse each subtree into the objects as defined above
    queryResult.forEach((subtree) => {
        const proteoform_node = subtree.nodes[0]
        const remaining_nodes = subtree.nodes.slice(1)
        const node_types = subtree.node_types.slice(1)
        const relationship_props = subtree.rel_props

        const affected_splice_sites =  proteoform_node.splice_sites_affected === '-' ? [] : proteoform_node.splice_sites_affected.split(';').map((elem: string) => parseInt(elem))

        let root: Proteoform = {
            id: proteoform_node.id,
            length: proteoform_node.length,
            sequence: proteoform_node.sequence,
            start_aa: proteoform_node.start_aa,
            reading_frame: proteoform_node.reading_frame,
            cDNA_changes: proteoform_node.cDNA_changes,
            protein_changes: proteoform_node.protein_changes,
            splice_sites_affected: affected_splice_sites,
            transcript: null,
            haplotype: null,
            matching_peptides: [],
            matching_peptide_positions: []
        }

        let peptides: Array<Peptide> = []
        let spectra: Array<Spectrum> = []
        let samples: Array<Sample> = []

        // create the node objects
        remaining_nodes.forEach((node, idx) => {
            const node_type = node_types[idx][0];
            switch (node_type) {
                case ("Peptide"):
                    peptides.push({
                        id: node.id,
                        length: node.length,
                        sequence: node.sequence,
                        class_1: node.pep_class_1,
                        class_2: node.pep_class_2,
                        matching_spectra: [],
                        PSM_PEP: [],
                        PSM_q_vals: [],
                        PSM_RT_errors: [],
                        PSM_spec_simil: []
                    })
                    break

                case ("Spectrum"):
                    spectra.push({
                        id: node.id,
                        spec_title: node.title,
                        precursor_mz: node.precursor_mz,
                        precursor_intensity: node.precursor_intensity,
                        fragment_technique: node.frag_technique,
                        proteases: node.proteases,
                        retention_time: node.retention_time,
                        spectrometer: node.spectrometer,
                        sample: null,
                        fraction_id: node.fraction_id
                    })
                    break

                case ("Sample"):
                    samples.push({
                        id: node.id,
                        tissue: node.tissue_name,
                        indiv_age: node.individual_age,
                        indiv_sex: node.individual_sex,
                        phenotype: "healthy",
                        pride_accession: node.price_project_accession
                    })
                    break
            }
        })

        // connect the nodes (create edges)
        subtree.relationships.forEach((edge, idx) => {
            switch (edge[1]) {
                case 'MAPS_TO': {                    
                    const peptide = peptides.find((elem) => elem.id === edge[0].id)
                    const pos = relationship_props[idx].position
                    
                    root.matching_peptides.push(peptide)
                    root.matching_peptide_positions.push(pos)
                    break
                }

                case 'MATCHED_TO': {
                    const peptide = peptides.find((elem) => elem.id === edge[0].id)
                    const spectrum = spectra.find((elem) => elem.id === edge[2].id)
                    const q_val = relationship_props[idx].q_value
                    const PEP = relationship_props[idx].posterior_error_prob
                    const RT_err = relationship_props[idx].rt_abs_error
                    const spec_simil = relationship_props[idx].spectra_angular_similarity

                    peptide.matching_spectra.push(spectrum)
                    peptide.PSM_q_vals.push(q_val)
                    peptide.PSM_PEP.push(PEP)
                    peptide.PSM_RT_errors.push(RT_err)
                    peptide.PSM_spec_simil.push(spec_simil)
                    break
                }

                case 'MEASURED_FROM': {
                    const spectrum = spectra.find((elem) => elem.id === edge[0].id)
                    const sample = samples.find((elem) => elem.id === edge[2].id)

                    spectrum.sample = sample
                    break
                }
            }
        })

        parsedResult.push(root)
    });

    return parsedResult
}