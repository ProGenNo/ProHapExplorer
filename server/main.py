from flask import Flask, request, send_from_directory, make_response
from neo4j_handler import init as neo4j_init, search_gene, search_gene_id, search_proteoform_id

# Set up application.
app = Flask(
    __name__,
    static_url_path="/",
    static_folder="../public",
)

#neo4j_init("bolt://localhost:7687", "neo4j", "RisgrotIsGood")
neo4j_init("neo4j+s://d987cc4a.databases.neo4j.io", 'neo4j', "AYxWKLAmohnbFRtN5ydiYdcgkSFj0zaWxARHzT4oOss")

# Path for our main Svelte page
@app.route("/")
def client():
    return send_from_directory('../public', 'index.html')

@app.route('/search', methods = ['POST'])
def search_request():
    args = request.get_json()

    if (args['type'] == 'Gene Name'):
        return search_gene(args['value'])
    elif (args['type'] == 'Gene ID'):
        return search_gene_id(args['value'])
    elif (args['type'] == 'Proteoform'):
        return search_proteoform_id(args['value'])

    return make_response("not available", status=404)

app.run(port='8000')
