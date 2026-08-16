# Fase 8 — Avaliação: resultados

Registro dos experimentos pedidos na seção 22 (comparação Token Bucket) e seção 23
(comparação GiST) de `desenvolvimento.md`. Ver `README.md` nesta pasta para como
reproduzir.

## Comparação Token Bucket (seção 22)

Carga gerada com k6: 50 VUs constantes por 20s, disparando `POST
/events/:eventId/interests` contra o mesmo evento (capacidade artificialmente alta,
para isolar o comportamento do rate limiter da lógica de negócio de capacidade), com
300 usuários pré-cadastrados escolhidos aleatoriamente a cada requisição.

| Métrica                          | Sem Token Bucket (capacity=1.000.000) | Com Token Bucket (capacity=100, refill=20/s) |
| --------------------------------- | -------------------------------------: | ---------------------------------------------: |
| Total de requisições              |                                   8.066 |                                          14.325 |
| Aceitas (201)                     |                                     300 |                                             248 |
| Rejeitadas por regra de negócio (409) |                                 7.766 |                                             252 |
| Rejeitadas por rate limit (429)   |                                       0 |                                          13.825 |
| Latência média                    |                                123,9 ms |                                          69,7 ms |
| Latência máxima                   |                                582,1 ms |                                       1.745,0 ms |
| Latência p95                      |                                160,0 ms |                                          79,3 ms |
| Throughput                        |                             402,3 req/s |                                        714,8 req/s |

**Leitura dos resultados:**

- **Sem o Token Bucket**, praticamente toda requisição chega até a lógica de negócio
  (transação no Postgres, verificação de duplicidade), o que explica a latência média
  mais alta (123,9 ms) — cada requisição paga o custo total do caminho crítico.
- **Com o Token Bucket**, a maioria das requisições (13.825 de 14.325 = 96,5%) é
  rejeitada com `429` *antes* de tocar o banco — o guard consulta o Redis (uma
  operação `EVAL` local) e retorna, sem abrir transação nenhuma. Isso explica dois
  efeitos aparentemente contraintuitivos:
  - **Latência média mais baixa** (69,7 ms vs 123,9 ms): a maior parte das respostas é
    um `429` rápido, puxando a média para baixo, mesmo com outliers de fila (máximo de
    1.745 ms, provavelmente uma requisição que esperou por uma conexão do pool
    enquanto outras seguravam a transação).
  - **Throughput mais alto** (714,8 req/s vs 402,3 req/s): o servidor consegue
    *processar* (não confundir com "aceitar") mais requisições por segundo porque a
    maioria delas é descartada cedo, sem consumir uma conexão de banco.
- O número de requisições aceitas com sucesso (`201`) é *menor* com o Token Bucket
  (248 vs 300) — exatamente o comportamento esperado: o rate limiter protege o sistema
  em troca de aceitar uma fração menor de picos de demanda extrema, permitindo
  throughput sustentável (~20 tokens/s de refill) em vez de deixar passar tudo de uma
  vez. O total de requisições que passaram pelo bucket (248 + 252 = 500) bate quase
  exatamente com a previsão teórica do algoritmo: capacity inicial (100) + refill ao
  longo de 20s (20 × 20 = 400) = 500.

JSON bruto: `result-sem-token-bucket.json`, `result-com-token-bucket.json`.

## Comparação GiST (seção 23)

Massa de dados sintética gerada diretamente no Postgres (`generate_series` +
coordenadas aleatórias numa caixa delimitadora cobrindo o Brasil), nas escalas de
10.000, 50.000 e 100.000 eventos. Consulta de proximidade idêntica à usada por
`EventsService.findNearby` (`ST_DWithin` + `ORDER BY ST_Distance` + `LIMIT 50`),
medida com `EXPLAIN (ANALYZE, BUFFERS)`.

| Cenário                          | Plano escolhido                          | Tempo de execução |
| --------------------------------- | ----------------------------------------- | ------------------: |
| 10k eventos, com índice GiST      | Bitmap Index Scan em `IDX_events_location_gist` | 10,3 ms       |
| 50k eventos, com índice GiST      | Bitmap Index Scan em `IDX_events_location_gist` | 20,7 ms       |
| 100k eventos, com índice GiST     | Bitmap Index Scan em `IDX_events_location_gist` | 34,9 ms       |
| 100k eventos, **sem** índice GiST | Parallel Seq Scan (2 workers)             | 105,6 ms            |

**Leitura dos resultados:**

- Com o índice GiST, o tempo de execução cresce de forma sub-linear com o volume de
  dados (10,3 ms → 20,7 ms → 34,9 ms ao multiplicar os dados por 10) — o índice espacial
  permite descartar rapidamente a maior parte da tabela sem examiná-la, então o custo
  escala com o número de eventos *dentro do raio de busca* (que cresce devagar), não
  com o tamanho total da tabela.
- Sem o índice (removido deliberadamente só para este teste, e recriado logo em
  seguida), o Postgres recorre a um *Parallel Seq Scan* — varre a tabela inteira
  (100.000 linhas, divididas entre 2 workers) calculando `ST_DWithin` linha a linha.
  Mesmo com paralelismo ajudando, o tempo de execução (105,6 ms) é **~3× maior** que
  com o índice (34,9 ms) no mesmo volume de dados. Sem paralelismo (ex.: em uma
  instância com menos CPUs disponíveis, ou conforme a tabela crescesse além de
  100k), essa diferença tende a aumentar.
- Os dois planos retornam o mesmo resultado (`rows=6024` correspondem aos eventos
  dentro do raio de 500 km do ponto de consulta) — a diferença é inteiramente sobre
  *como* o Postgres chega até esse resultado, confirmando que o índice GiST muda o
  método de acesso (`Bitmap Index Scan` vs `Seq Scan`), não o resultado.

Saída completa do `EXPLAIN ANALYZE` de cada cenário: `gist-results.txt`.

## Testes de carga e concorrência (demais itens da Fase 8)

- **Testes de carga**: a comparação do Token Bucket acima já é, em si, um teste de
  carga real via k6 (não simulação) contra o servidor rodando em Docker.
- **Testes de concorrência**: cobertos na Fase 3 por
  `backend/test/interests-concurrency.e2e-spec.ts` — 1000 requisições HTTP
  verdadeiramente concorrentes contra um evento de `capacity=100`, verificando
  `participantes finais <= capacity`, sobrevenda = 0 e ausência de manifestações
  duplicadas (ver `ARCHITECTURE.md`, seção "Teste automatizado de concorrência").
  Não foi duplicado aqui em k6 porque o teste Jest já verifica a garantia de
  corretude (não apenas de performance) e roda como parte da suíte automatizada do
  projeto, o que um script k6 avulso não faria.
- **Métricas**: reportadas por cada experimento acima (latência, throughput, planos de
  execução, contagem de respostas por status).
