#!/bin/sh

set -e

DB="psql -U postgres -d tcc_eventos -v ON_ERROR_STOP=1"
ARTIST_ID="00000000-0000-4000-8000-000000000001"

echo "=== Criando artista de benchmark ($ARTIST_ID) ==="
$DB -c "
  INSERT INTO artists (id, name, description, location)
  VALUES ('$ARTIST_ID', 'Artista de Benchmark GiST', null, ST_SetSRID(ST_MakePoint(-49.27,-25.42),4326)::geography)
"

insert_synthetic_events() {
  COUNT=$1
  echo "--- Inserindo $COUNT eventos sinteticos ---"
  $DB -c "
    INSERT INTO events (
      \"artistId\", name, description, \"eventDate\", capacity, \"minimumQuorum\",
      \"priceCents\", \"currentInterest\", location, status
    )
    SELECT
      '$ARTIST_ID',
      'Benchmark Event ' || i,
      null,
      now() + (i || ' minutes')::interval,
      100, 10, 0, 0,
      ST_SetSRID(ST_MakePoint(
        -73.0 + random() * 40.0,
        -33.0 + random() * 28.0
      ), 4326)::geography,
      'OPEN'
    FROM generate_series(1, $COUNT) AS i
  "
}

explain_query() {
  LABEL=$1
  echo ""
  echo "=== EXPLAIN ANALYZE: $LABEL ==="
  # Essa query e igual a do EventsService.findNearby (so tirei o filtro por artista).
  # Cuidado: o benchmark so da certo se a tabela events estiver vazia antes de rodar,
  # senao os numeros ficam bagunçados.
  $DB -c "
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id FROM events
    WHERE status = ANY(ARRAY['OPEN','QUORUM_REACHED'])
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(-53.0,-19.0), 4326)::geography, 500000)
    ORDER BY ST_Distance(location, ST_SetSRID(ST_MakePoint(-53.0,-19.0), 4326)::geography) ASC
    LIMIT 50
  "
}

echo ""
echo "############################################"
echo "# Escala: 10.000 eventos (com indice GiST)"
echo "############################################"
insert_synthetic_events 10000
explain_query "10k eventos, COM indice GiST"

echo ""
echo "############################################"
echo "# Escala: 50.000 eventos (com indice GiST)"
echo "############################################"
insert_synthetic_events 40000
explain_query "50k eventos, COM indice GiST"

echo ""
echo "############################################"
echo "# Escala: 100.000 eventos (com indice GiST)"
echo "############################################"
insert_synthetic_events 50000
explain_query "100k eventos, COM indice GiST"

echo ""
echo "############################################"
echo "# 100.000 eventos, SEM indice GiST (removido temporariamente)"
echo "############################################"
$DB -c "DROP INDEX \"IDX_events_location_gist\""
explain_query "100k eventos, SEM indice GiST"

echo ""
echo "=== Recriando indice GiST ==="
$DB -c "CREATE INDEX \"IDX_events_location_gist\" ON events USING GIST (location)"

echo ""
echo "=== Limpando dados sinteticos ==="
$DB -c "DELETE FROM events WHERE \"artistId\" = '$ARTIST_ID'"
$DB -c "DELETE FROM artists WHERE id = '$ARTIST_ID'"

echo "=== Benchmark concluido ==="
