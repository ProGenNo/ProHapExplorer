// Code taken from: https://stackoverflow.com/questions/43725419/converting-nucleotides-to-amino-acids-using-javascript

const aminoDict = { 'A': ['GCA','GCC','GCG','GCT'], 'C': ['TGC','TGT'], 'D': ['GAC', 'GAT'], 'E': ['GAA','GAG'], 'F': ['TTC','TTT'], 'G': ['GGA','GGC','GGG','GGT'], 'H': ['CAC','CAT'], 'I': ['ATA','ATC','ATT'], 'K': ['AAA','AAG'], 'L': ['CTA','CTC','CTG','CTT','TTA','TTG'], 'M': ['ATG'], 'N': ['AAC','AAT'], 'P': ['CCA','CCC','CCG','CCT'], 'Q': ['CAA','CAG'], 'R': ['AGA','AGG','CGA','CGC','CGG','CGT'], 'S': ['AGC','AGT','TCA','TCC','TCG','TCT'], 'T': ['ACA','ACC','ACG','ACT'], 'V': ['GTA','GTC','GTG','GTT'], 'W': ['TGG'], 'Y': ['TAC','TAT'] };

// codon dictionary derived from aminoDict
const codonDict =
 Object.keys(aminoDict).reduce((dict, a) =>
   Object.assign(dict, ...aminoDict[a].map(c => ({[c]: a}))), {})

// slide :: (Int, Int) -> [a] -> [[a]]
const slide = (n,m) => xs => {
  if (n > xs.length)
    return []
  else
    return [xs.slice(0,n), ...slide(n,m) (xs.slice(m))]
}

// slideStr :: (Int, Int) -> String -> [String]
const slideStr = (n: number, m: number) => (str: string) =>
  slide(n,m) (Array.from(str)) .map(s => s.join(''))

// codon2amino :: String -> String
export const cdna2amino = (str: string) => {
  str = str.replace(/x+/, "")

  const extra_bp = (str.length % 3)
  str = str.slice(0, str.length - extra_bp)

  return slideStr(3,3)(str)
    .map(c => codonDict[c])
    .join('')

}