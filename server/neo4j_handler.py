from neo4j import GraphDatabase
import json

def init(URI, user, password):
    DB_connection = GraphDatabase.driver(uri=URI, auth=(user, password))
    global session
    session = DB_connection.session()

def get_overview():
    query_str = "MATCH (g:Gene) RETURN g;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)

def search_gene(gene_name):
    query_str = 'MATCH (g:Gene {name: \'' + gene_name + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(g, {relationshipFilter:'<TRANSCRIPT_OF|<EXON_PART_OF|<VARIANT_MAPS_TO|<INCLUDES_ALT_ALLELE|INCLUDES_EXON>|HAPLO_FORM_OF|<ENCODED_BY_TRANSCRIPT|<ENCODED_BY_HAPLOTYPE|<MAPS_TO'}) YIELD nodes, relationships RETURN nodes, [ v in nodes | labels(v) ] as node_types, relationships, [ r in relationships | PROPERTIES(r) ] as rel_props;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)

def search_gene_id(gene_id):
    query_str = 'MATCH (g:Gene {id: \'' + gene_id + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(g, {relationshipFilter:'<TRANSCRIPT_OF|<EXON_PART_OF|<VARIANT_MAPS_TO|<INCLUDES_ALT_ALLELE|INCLUDES_EXON>|HAPLO_FORM_OF|<ENCODED_BY_TRANSCRIPT|<ENCODED_BY_HAPLOTYPE|<MAPS_TO'}) YIELD nodes, relationships RETURN nodes, [ v in nodes | labels(v) ] as node_types, relationships, [ r in relationships | PROPERTIES(r) ] as rel_props;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)

def search_proteoform_id(proteoform_id):
    query_str = 'MATCH (prot:Proteoform {id: \'' + proteoform_id + '\'}) '
    query_str += "CALL apoc.path.subgraphAll(prot, {relationshipFilter:'<MAPS_TO|MATCHED_TO>|MEASURED_FROM>'}) YIELD nodes, relationships RETURN nodes, [ v in nodes | labels(v) ] as node_types, relationships, [ r in relationships | PROPERTIES(r) ] as rel_props;"
    query_response = session.run(query_str).data()
    return json.dumps(query_response)