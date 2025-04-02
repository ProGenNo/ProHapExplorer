# Protein Haplotype Explorer
ProHap Explorer a novel visual exploration tool designed to interrogate the influence of common haplotypes on the human proteome, exploring a dataset obtained using the [ProHap](https://github.com/ProGenNo/ProHap) workflow. 
## Deployment:
Temporarily, ProHap Explorer is accessible at [https://jellyfish-app-g4taj.ondigitalocean.app/](https://jellyfish-app-g4taj.ondigitalocean.app/) with a limited dataset showing peptide-spectrum matches from the reprocessing of one proteomic study.
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
