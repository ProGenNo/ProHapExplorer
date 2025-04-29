from flask import Flask, request, send_from_directory, make_response
from neo4j_handler import init as neo4j_init, search_gene, search_gene_id, get_overview, get_overview_genes, search_peptide_list, search_proteoform_peptides
import gzip

# Set up application.
app = Flask(
    __name__,
    static_url_path="/",
    static_folder="../public",
)

neo4j_init("bolt://0.0.0.0:0000", 'usr', "password")

#print(search_peptide_list(["ELSHLPSLYDYSAYRR", "ELSHLPSLYDYSAYR", "AGELEVFNGYFVHFFAPDNLDPLPK"]))
#get_overview_genes()

# Path for our main Svelte page
@app.route("/")
def client():
    return send_from_directory('../public', 'index.html')

@app.route('/overview', methods = ['GET'])
def overview_request():
    try:
        response = make_response(gzip.compress(get_overview().encode('utf8')))
        response.headers['Content-Encoding'] = 'gzip'
        response.headers['Vary'] = 'Accept-Encoding'
        response.headers['Content-Length'] = len(response.data)
        return response
    except:
        return make_response("server error", 500)

@app.route('/search', methods = ['POST'])
def search_request():
    args = request.get_json()

    if (args['type'] == 'Gene Name'):
        compressed_data = gzip.compress(search_gene(args['value']).encode('utf8'))
        response = make_response(compressed_data)
        response.headers['Content-Encoding'] = 'gzip'
        response.headers['Vary'] = 'Accept-Encoding'
        response.headers['Content-Length'] = len(response.data)
        return response
    
    elif (args['type'] == 'Gene ID'):
        return search_gene_id(args['value'])
    
    elif (args['type'] == 'Proteoform'):
        compressed_data = gzip.compress(search_proteoform_peptides(args['value']).encode('utf8'))
        response = make_response(compressed_data)
        response.headers['Content-Encoding'] = 'gzip'
        response.headers['Vary'] = 'Accept-Encoding'
        response.headers['Content-Length'] = len(response.data)
        return response
    
    elif (args['type'] == 'Peptides'):
        return search_peptide_list(args['value'].split(';'))

    return make_response("server error", 500)

app.run(port='8000')
