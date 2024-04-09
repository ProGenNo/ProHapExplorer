# Protein Haplotype Viewer
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
## Debug Run

Build client app:
```
cd client; npm run build;
```

Run server:
```
cd ../server; python main.py;
```

The app will be accessible at `http://localhost:8000/`.
