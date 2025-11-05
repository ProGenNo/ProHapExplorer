# Protein Haplotype Explorer
ProHap Explorer is a novel visual exploration tool designed to interrogate the influence of common haplotypes on the human proteome, exploring a dataset obtained using the [ProHap](https://github.com/ProGenNo/ProHap) workflow. 
## Access:
As a web-based tool, ProHap Explorer can be accesses in any web broswer (tested primarily with Firefox and Google Chrome), without the need to install additional software. 

Temporarily, ProHap Explorer is accessible at [https://prohap-explorer-europe-tnusf.ondigitalocean.app/](https://prohap-explorer-europe-tnusf.ondigitalocean.app/) with a dataset showing peptide-spectrum matches from the reprocessing of one proteomic study.
## Citation:
If you use ProHap Explorer in your work, please cite:

J. Vašíček, D. Skiadopoulou, K. G. Kuznetsova, L. Käll, M. Vaudel and S. Bruckner, "ProHap Explorer: Visualizing Haplotypes in Proteogenomic Datasets," _IEEE Computer Graphics and Applications_, vol. 45, no. 5, pp. 64-77, Sept.-Oct. 2025, doi: [10.1109/MCG.2025.3581736](https://doi.org/10.1109/MCG.2025.3581736).
## Requirements for building from source:
* node.js, NPM, Python >= 3.10
* Python libraries: flask, neo4j
## Install dependencies
Frontend libraries:
```
cd client; npm install;
```
Python server libraries:
```
pip install flask neo4j;
```
## Build and Run

To run ProHap Explorer locally, a `neo4j` database built using [ProHap Graph](https://github.com/ProGenNo/ProHap_Graph) has to be linked.

```
# Build client app
cd client; npm run build;

# Run server
cd ../server; python main.py;
```

The app will be accessible at `http://localhost:8000/`.
