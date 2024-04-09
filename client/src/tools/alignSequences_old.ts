export interface CDNAvariant {
  variant_id: string,
  loc_relative: number, // relative location in cDNA - location of the reference nucleic acid in the transcript
  loc_absolute: number, // location of the reference nucleic acid in the genome
  ref_allele: string,
  alt_allele: string,
  codon_idx: number, // index of the affected codon (start of the changed region)
  codon_pos: number, // position of the nucleic acid in the codon (0, 1 or 2)
}

export interface ProteinChanges {
  position: number;
  ref_AA: string;
  var_AA: string;
}

export interface Insertion {
  variant_id: string,
  position: number;
  codon_idx: number; // index of the affected codon (start of the changed region)
  codon_pos: number, // position of the nucleic acid in the codon (0, 1 or 2)
  sequence: string;
}

export interface Deletion {
  variant_id: string,
  position: number;
  codon_idx: number; // index of the affected codon (start of the changed region)
  codon_pos: number, // position of the nucleic acid in the codon (0, 1 or 2)
  sequence: string;
}

export interface Alignment {
  codons: Array<string>;
  var_codons: Array<Array<string>>;
  reading_frame: number;
  protein_changes: Array<Array<ProteinChanges>>;
  cdna_changes: Array<CDNAvariant>;
  prefix_length: Array<number>;
  postfix_length: Array<number>;
  insertions: Array<Insertion>;
  deletions: Array<Deletion>;
}

const CODON_MAP = {
  TTT: "F",
  TTC: "F",
  TTA: "L",
  TTG: "L",
  TCT: "S",
  TCC: "S",
  TCA: "S",
  TCG: "S",
  TAT: "Y",
  TAC: "Y",
  TAA: "*",
  TAG: "*",
  TGT: "C",
  TGC: "C",
  TGA: "*",
  TGG: "W",
  CTT: "L",
  CTC: "L",
  CTA: "L",
  CTG: "L",
  CCT: "P",
  CCC: "P",
  CCA: "P",
  CCG: "P",
  CAT: "H",
  CAC: "H",
  CAA: "Q",
  CAG: "Q",
  CGT: "R",
  CGC: "R",
  CGA: "R",
  CGG: "R",
  ATT: "I",
  ATC: "I",
  ATA: "I",
  ATG: "M",
  ACT: "T",
  ACC: "T",
  ACA: "T",
  ACG: "T",
  AAT: "N",
  AAC: "N",
  AAA: "K",
  AAG: "K",
  AGT: "S",
  AGC: "S",
  AGA: "R",
  AGG: "R",
  GTT: "V",
  GTC: "V",
  GTA: "V",
  GTG: "V",
  GCT: "A",
  GCC: "A",
  GCA: "A",
  GCG: "A",
  GAT: "D",
  GAC: "D",
  GAA: "E",
  GAG: "E",
  GGT: "G",
  GGC: "G",
  GGA: "G",
  GGG: "G",
};

// align the variant to the reference protein
// look for a corresponding region of 10 AAs with maximum edit distance of 1
function alignProteinVariant(refProtein: string, varProtein: string, varDescription: string) {
  const windowSize = 7;
  let proteinChanges: Array<ProteinChanges> = [];
  let prefix_length: number, postfix_length: number;

  for (let i = 0; i < varProtein.length - windowSize; i++) {
    if (prefix_length == undefined) {
      let edit_distance = 0;
      for (var j = 0; j < windowSize; j++) {
        if (varProtein[i + j] != refProtein[j]) {
          edit_distance += 1;
        }
      }

      if (edit_distance <= 2) {
        prefix_length = i;
      }
    } else if (i >= prefix_length && i - prefix_length < refProtein.length) {
      // look for changes in the protein sequence after alignment (currently accounts only for single AA modifications)
      if (varProtein[i] != refProtein[i - prefix_length]) {
        proteinChanges.push({ position: i, ref_AA: refProtein[i - prefix_length], var_AA: varProtein[i] } );
      }
    }
  }
  if (prefix_length == undefined) {
    console.warn("Reference protein and variant could not be aligned: " + varDescription);
  } else {
    postfix_length = varProtein.length - prefix_length - refProtein.length;
  }

  return { proteinChanges: proteinChanges, prefix_length: prefix_length, postfix_length: postfix_length }
}

// find the correct reading frame and split into codons
function splitIntoCodons(refGene: string, refProtein: string, prefix_length: number) {
  let start = prefix_length * 3;

  let possibleOptions = [true, true, true];

  let ref_aa = 0;

  // try mapping all three reading frames to the protein sequence until only one matches
  while (possibleOptions.filter(elem => elem).length > 1 && ref_aa < refProtein.length) {
    let codon = refGene.slice(start, start + 3);
    if (CODON_MAP[codon] != refProtein[ref_aa]) {
      possibleOptions[0] = false
    }

    codon = refGene.slice(start + 1, start + 4);
    if (CODON_MAP[codon] != refProtein[ref_aa]) {
      possibleOptions[1] = false
    }

    codon = refGene.slice(start + 2, start + 5);
    if (CODON_MAP[codon] != refProtein[ref_aa]) {
      possibleOptions[2] = false
    }

    ref_aa += 1;
    start += 3;
  }

  if (possibleOptions.filter(elem => elem).length != 1) {
    console.warn("Reading frame could not be determined!");
    return undefined;
  }
  
  const reading_frame = possibleOptions.findIndex(elem => elem);
  let codons = [];

  for (let i = reading_frame + 2; i < refGene.length; i += 3) {
    codons.push(refGene[i - 2] + refGene[i - 1] + refGene[i]);
  }

  return {
    reading_frame: reading_frame,
    codons: codons,
  }
}

function indelGetNewCodons(codonIdx: number, codonPos: number, readingFrame: number, refCodons: Array<string>, refSequence: string, altAllele: string, overlapLength: number) {
  let varCodons = refCodons.slice(0, codonIdx);

  // first codon that is modified
  let firstVarCodon = refCodons[codonIdx].slice(0, codonPos);
  firstVarCodon += altAllele.slice(0, 3 - codonPos);

  
  let i = 3 - codonPos; // position within the alt sequence
  let r = readingFrame + codonIdx * 3 + codonPos + overlapLength;  // position within the ref sequence to continue from

  // check if the entire alt sequence fits into the first codon
  if (firstVarCodon.length < 3) {
    const missing = 3 - firstVarCodon.length;
    firstVarCodon += refSequence.slice(r, r + missing);
    r += missing;    
    varCodons.push(firstVarCodon);
  } else {
    varCodons.push(firstVarCodon);

    // all the complete codons of the insertion (if any)
    for (; i < altAllele.length - 3; i += 3) {
      varCodons.push(altAllele.slice(i, i + 3));
    }
  }

  // remaining letters in the alt sequence (if any) and rest of the reference
  let lastVarCodon = altAllele.slice(i, altAllele.length);
  const missing = 3 - lastVarCodon.length;
  lastVarCodon += refSequence.slice(r, r + missing);
  varCodons.push(lastVarCodon);

  for (r += missing; r < refSequence.length - 3; r += 3) {
    varCodons.push(refSequence.slice(r, r + 3));
  }

  return varCodons;
}

/**
 * Aligns the reference protein to all provided variants and to the cDNA sequence (split into codons)
 * @param {*} refGene reference cDNA sequence
 * @param {*} refGeneLoc reference gene location
 * @param {*} refGeneSplicing reference gene splicing info
 * @param {*} refProtein reference protein sequence
 * @param {*} varProteins array: protein variant sequences
 * @param {*} varDescriptions array: strings describing the variation (taken from the variant protein description)
 * @returns Information concerning sequence alignment: prefix and postfix length (# codons), changes in protein and cDNA for each variant (position, reference, alternative)
 */
export function alignSequences(refGene: string, refGeneLoc: string, refGeneSplicing: string, refProtein: string, varProteins: string[], varDescriptions: string[]) {
  if (!refGene || !refProtein) {
    return undefined;
  }

  if (!refGeneSplicing) {
    console.warn("Cannot find splicing for gene at", refGeneLoc);
  }

  let result: Alignment = {
    codons: [],
    var_codons: [],
    reading_frame: undefined,
    protein_changes: [],
    cdna_changes: [],
    prefix_length: [],
    postfix_length: [],
    insertions: [],
    deletions: []
  };


  if (varProteins && varProteins.length > 0) {
    varProteins.forEach((varProtein, v) => {

      let varAlignment = alignProteinVariant(refProtein, varProtein, varDescriptions[v])
      result.protein_changes.push(varAlignment.proteinChanges);
      result.prefix_length.push(varAlignment.prefix_length);
      result.postfix_length.push(varAlignment.postfix_length);

    });

    // divide the gene sequence into codons
  
    let codonSplit = splitIntoCodons(refGene, refProtein, result.prefix_length[0]);
    result.codons = codonSplit.codons;
    result.reading_frame = codonSplit.reading_frame;

    // once we have aligned the reference and variant protein and identified the prefix and postfix, we can look at changes between reference and variant cDNA
    // for this, we need splicing information, to see where to look for the reference allele
    // as the VCF gives info about the position on the chromosome, but not in the cDNA

    const exons = refGeneSplicing.split(";").map((range) => range.split("-").map((str) => parseInt(str)));

    // for a position on the chromosome, returns relative position on the cDNA given the splicing above
    const getRelativeLocation = (bpPos: number) => {
      let res = 0;

      for (let i = 0; i < exons.length; i++) {
        if (exons[i][1] > bpPos) {
          return res + (bpPos - exons[i][0]);
        } else {
          res += exons[i][1] - exons[i][0] + 1;
        }
      }
    };

    varDescriptions.forEach((description, v) => {
      const desc_parsed = description.split(".");
      const variant_id = desc_parsed[0];
      const loc_absolute = parseInt(desc_parsed[1]);
      const loc_relative = getRelativeLocation(loc_absolute);
      const ref_allele = desc_parsed[2];
      const alt_allele = desc_parsed[3].split("_")[0];
      const codon_idx = Math.floor((loc_relative - result.reading_frame) / 3);
      const codon_pos = (loc_relative - result.reading_frame) % 3;

      const overlap_length = Math.min(ref_allele.length, alt_allele.length);

      // check whether the polymorphim is an insertion or deletion
      if (ref_allele.length < alt_allele.length) {
        result.insertions.push({
          variant_id: desc_parsed[0],
          position: loc_relative + overlap_length,
          codon_idx: codon_idx + Math.floor((codon_pos + overlap_length) / 3),
          codon_pos: (loc_relative + overlap_length) % 3,
          sequence: alt_allele.slice(ref_allele.length, alt_allele.length),
        });
      } else if (ref_allele.length > alt_allele.length) {
        result.deletions.push({
          variant_id: desc_parsed[0],
          position: loc_relative + overlap_length,
          codon_idx: codon_idx + Math.floor((codon_pos + overlap_length) / 3),
          codon_pos: (loc_relative + overlap_length) % 3,
          sequence: ref_allele.slice(alt_allele.length, ref_allele.length),
        });
      } 

      const var_codons = indelGetNewCodons(codon_idx, codon_pos, result.reading_frame, result.codons, refGene, alt_allele, overlap_length);

      // check: do these codons match the variant protein?
      var_codons.forEach((codon, c) => {
        if (CODON_MAP[codon] != varProteins[v][c]) {
          let foundLetter = varProteins[v][c];
          let expectedLetter = CODON_MAP[codon];
          //console.warn(`Reading frame does not match translation: ${description}, codon: ${c}: ${foundLetter} x ${expectedLetter}`);
        }
      });

      //console.log("Reference allele: ", ref_allele, refGene[loc_relative], result.codons[codon_idx]);

      result.cdna_changes.push({
        variant_id: variant_id,
        loc_relative: loc_relative, // relative location in cDNA - location of the reference nucleic acid in the transcript
        loc_absolute: loc_absolute, // location of the reference nucleic acid in the genome
        ref_allele: ref_allele,
        alt_allele: alt_allele,
        codon_idx: codon_idx, // index of the affected codon (start of the changed region)
        codon_pos: codon_pos, // position of the nucleic acid in the codon (0, 1 or 2)
      });
      //console.log("Changes in cDNA: " + JSON.stringify(result.cdnaChanges[v]));
    });
  }

  // sort insertions and deletions by position - if they start at the same locus, put the longest one first
  result.insertions.sort((a, b) => { if (a.position != b.position) return a.position - b.position; else return b.sequence.length - a.sequence.length })
  result.deletions.sort((a, b) =>  { if (a.position != b.position) return a.position - b.position; else return b.sequence.length - a.sequence.length })
  // result.cdna_changes.sort((a, b) => a.loc_relative - b.loc_relative)

  return result;
}
