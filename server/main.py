from flask import Flask, request, send_from_directory, make_response
from neo4j_handler import init as neo4j_init, search_gene, search_gene_id, get_overview, get_overview_genes, search_peptide_list, search_proteoform_peptides

# Set up application.
app = Flask(
    __name__,
    static_url_path="/",
    static_folder="../public",
)

neo4j_init("neo4j+s://d987cc4a.databases.neo4j.io", 'neo4j', "AYxWKLAmohnbFRtN5ydiYdcgkSFj0zaWxARHzT4oOss")

#print(search_peptide_list(["ELSHLPSLYDYSAYRR", "ELSHLPSLYDYSAYR", "AGELEVFNGYFVHFFAPDNLDPLPK"]))
#get_overview_genes()

# Path for our main Svelte page
@app.route("/")
def client():
    return send_from_directory('../public', 'index.html')

@app.route('/overview', methods = ['GET'])
def overview_request():
    try:
        return get_overview()
    except:
        return make_response("server error", 500)

@app.route('/search', methods = ['POST'])
def search_request():
    args = request.get_json()

    if (args['type'] == 'Gene Name'):
        return search_gene(args['value'])
    elif (args['type'] == 'Gene ID'):
        return search_gene_id(args['value'])
    elif (args['type'] == 'Proteoform'):
        return search_proteoform_peptides(args['value'])
    elif (args['type'] == 'Peptides'):
        return search_peptide_list(args['value'].split(';'))

    return make_response("not available", 404)

app.run(port='8000')
