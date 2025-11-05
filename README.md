# Protein Haplotype Explorer
ProHap Explorer a novel visual exploration tool designed to interrogate the influence of common haplotypes on the human proteome, exploring a dataset obtained using the [ProHap](https://github.com/ProGenNo/ProHap) workflow. 
## Deployment:
Temporarily, ProHap Explorer is accessible at [https://prohap-explorer-europe-tnusf.ondigitalocean.app/](https://prohap-explorer-europe-tnusf.ondigitalocean.app/) with a dataset showing peptide-spectrum matches from the reprocessing of one proteomic study.
## Citation:
If you use ProHap Explorer in your work, please cite:

J. Vašíček, D. Skiadopoulou, K. G. Kuznetsova, L. Käll, M. Vaudel and S. Bruckner, "ProHap Explorer: Visualizing Haplotypes in Proteogenomic Datasets," _IEEE Computer Graphics and Applications_, vol. 45, no. 5, pp. 64-77, Sept.-Oct. 2025, doi: [10.1109/MCG.2025.3581736](https://doi.org/10.1109/MCG.2025.3581736).
## Requirements:
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

```
# Build client app
cd client; npm run build;

# Run server
cd ../server; python main.py;
```

The app will be accessible at `http://localhost:8000/`.
