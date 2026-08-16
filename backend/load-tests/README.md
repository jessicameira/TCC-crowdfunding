# Testes de carga e benchmarks (Fase 8)

Scripts usados para os experimentos da seção 22 (Token Bucket) e seção 23 (GiST) de
`desenvolvimento.md`. Não fazem parte da suíte automatizada (`npm test`/`npm run
test:e2e`) — são scripts de avaliação, rodados manualmente. Resultados já registrados
em `RESULTS.md`.

Pré-requisitos: stack rodando via `docker compose up` a partir da raiz do projeto, e
[k6](https://k6.io) (usado aqui via Docker, sem instalação local:
`docker pull grafana/k6`).

## Comparação Token Bucket

```bash
# 1. Popula usuários + evento de teste (uma vez)
docker compose exec backend node load-tests/prepare-fixtures.js

# 2. Roda o k6 contra o servidor (Windows/Docker Desktop: host.docker.internal
#    resolve para o host a partir de um container standalone)
docker run --rm -v "$(pwd)/backend/load-tests:/scripts" -w /scripts \
  -e TARGET=http://host.docker.internal:3000 \
  grafana/k6 run /scripts/token-bucket.js

# 3. Para comparar "sem" Token Bucket: editar TOKEN_BUCKET_CAPACITY e
#    TOKEN_BUCKET_REFILL_RATE no .env para um valor bem alto (ex.: 1000000),
#    `docker compose up -d backend` para recriar o container com o novo valor,
#    limpar o estado do bucket (`redis-cli -n 0 DEL token-bucket:events-interests`)
#    e as manifestações de interesse do evento de teste, rodar de novo, depois
#    restaurar os valores originais (100 / 20) e recriar o container outra vez.

# 4. Limpar os dados de teste ao final
docker compose exec backend node load-tests/cleanup-fixtures.js
```

## Comparação GiST

```bash
cat backend/load-tests/gist-benchmark.sh | docker compose exec -T postgres sh > backend/load-tests/gist-results.txt
```

O próprio script cria e remove os dados sintéticos (eventos + 1 artista de
benchmark) — não precisa de limpeza manual depois. Ele também remove e recria o
índice GiST temporariamente para medir o cenário "sem índice"; se o script for
interrompido no meio, confirme que `IDX_events_location_gist` existe antes de rodar
de novo (`\d events` no psql, ou `SELECT indexname FROM pg_indexes WHERE
tablename='events'`).
