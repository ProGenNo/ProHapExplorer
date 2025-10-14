from neo4j import GraphDatabase
import json
import gzip

def init(URI, user, password):
    DB_connection = GraphDatabase.driver(uri=URI, auth=(user, password))
    global session
    session = DB_connection.session()

def get_overview_genes():
    query_str = "MATCH (g:Gene) RETURN g;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)

def get_overview():
    query_str = "MATCH (s:Sample) RETURN s.pride_project_accession AS label, count(s.pride_project_accession) AS value;"
    query_response_1 = session.run(query_str).data()
    query_str = "MATCH (s:Sample) RETURN s.tissue_name AS label, count(s.tissue_name) AS value;"
    query_response_2 = session.run(query_str).data()
    query_str = "MATCH (g:Gene) RETURN g;"
    query_response_genes = session.run(query_str).data()
    response = json.dumps([query_response_1, query_response_2, query_response_genes])
    #print(response)
    return response

def search_gene(gene_name):
    query_str = 'MATCH (g:Gene {name: \'' + gene_name + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(g, {relationshipFilter:'<TRANSCRIPT_OF|<EXON_PART_OF|<VARIANT_MAPS_TO|<INCLUDES_ALT_ALLELE|INCLUDES_EXON>|HAPLO_FORM_OF|<ENCODED_BY_TRANSCRIPT|<ENCODED_BY_HAPLOTYPE|<MAPS_TO'}) YIELD relationships "
    query_str += "RETURN apoc.util.compress(apoc.convert.toJson(relationships)) as rel_gzip; "

    query_response = session.run(query_str).data()
    response_decompressed = [{
        'relationships': gzip.decompress(gene['rel_gzip']).decode('utf8').replace("'", '"'),
    } for gene in query_response]

    return json.dumps(response_decompressed)

def search_gene_id(gene_id):
    query_str = 'MATCH (g:Gene {id: \'' + gene_id + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(g, {relationshipFilter:'<TRANSCRIPT_OF|<EXON_PART_OF|<VARIANT_MAPS_TO|<INCLUDES_ALT_ALLELE|INCLUDES_EXON>|HAPLO_FORM_OF|<ENCODED_BY_TRANSCRIPT|<ENCODED_BY_HAPLOTYPE|<MAPS_TO'}) YIELD relationships "
    query_str += "RETURN apoc.util.compress(apoc.convert.toJson(relationships)) as rel_gzip; "
    
    query_response = session.run(query_str).data()
    response_decompressed = [{
        'relationships': gzip.decompress(gene['rel_gzip']).decode('utf8').replace("'", '"'),
    } for gene in query_response]

    return json.dumps(response_decompressed)

def search_proteoform_id(proteoform_id):
    query_str = 'MATCH (prot:Proteoform {id: \'' + proteoform_id + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(prot, {relationshipFilter:'<MAPS_TO|MATCHED_TO>|MEASURED_FROM>'}) YIELD nodes, relationships RETURN nodes, [ v in nodes | labels(v) ] as node_types, relationships, [ r in relationships | PROPERTIES(r) ] as rel_props;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)

def search_proteoform_peptides(proteoform_id):
    query_str = 'MATCH (prot:Proteoform {id: \'' + proteoform_id + '\'})-[r]-(pept:Peptide) WITH DISTINCT pept AS peptides '
    query_str += "CALL apoc.path.subgraphAll(peptides, {relationshipFilter:'MAPS_TO>|ENCODED_BY_TRANSCRIPT>|TRANSCRIPT_OF>|MATCHED_TO>|MEASURED_FROM>'}) YIELD relationships "
    query_str += "RETURN apoc.util.compress(apoc.convert.toJson(relationships)) as rel_gzip; "
    
    query_response = session.run(query_str).data()
    response_decompressed = [{
        'relationships': gzip.decompress(pept['rel_gzip']).decode('utf8').replace("'", '"'),
    } for pept in query_response]

    return json.dumps(response_decompressed)

def search_peptide_list(peptides):
    query_str = 'MATCH (pept:Peptide) '
    query_str += 'WHERE any(s in pept.sequence where s in [' + ', '.join(['\"' + pept  + '\"' for pept in peptides]) + ']) '
    query_str += "CALL apoc.path.subgraphAll(pept, {relationshipFilter:'MAPS_TO>|ENCODED_BY_TRANSCRIPT>|TRANSCRIPT_OF>'}) YIELD nodes, relationships RETURN nodes, [ v in nodes | labels(v) ] as node_types, relationships, [ r in relationships | PROPERTIES(r) ] as rel_props;"
    #print(query_str)
    query_response = session.run(query_str).data()
    return json.dumps(query_response)