# Plataforma de Viabilização Coletiva de Eventos Culturais

Este projeto foi desenvolvido como parte do Trabalho de Conclusão de Curso (TCC) de Engenharia de
Software de Jessica Leandro de Meira e Allan Christian Krainski Ferrari: uma plataforma onde
eventos culturais só são confirmados — e só então geram cobrança — depois de atingirem um quórum
mínimo de interessados, aplicando o modelo all-or-nothing de crowdfunding à viabilização de eventos
locais. A monografia completa, com a fundamentação teórica, a metodologia e a avaliação
experimental (Token Bucket, PostGIS/GiST, controle de concorrência), está disponível em:
[[MONOGRAFIA]](https://github.com/jessicameira/TCC-crowdfunding/blob/main/monografia.md).

Status atual: protótipo completo, cobrindo da fundação (Docker, PostgreSQL/PostGIS, Redis) até a
avaliação experimental (testes de carga e concorrência com k6, comparando o sistema com e sem
Token Bucket e índice GiST).

## Stack

- Backend: NestJS + TypeScript + TypeORM
- Frontend: React + TypeScript + Vite
- Banco de dados: PostgreSQL + PostGIS
- Cache / estado compartilhado: Redis
- Testes: Jest (unitários/e2e) e k6 (carga, a partir da Fase 5)
- Infraestrutura: Docker + Docker Compose

## Pré-requisitos

- Docker e Docker Compose

Não é necessário ter Node.js instalado localmente: as dependências são instaladas dentro dos
containers.

## Como executar

```bash
cp .env.example .env
docker compose up --build
```

Serviços expostos:

| Serviço  | URL                          |
| -------- | ----------------------------- |
| Frontend | http://localhost:5173         |
| Backend  | http://localhost:3000         |
| Health   | http://localhost:3000/health  |
| Postgres | localhost:5432                |
| Redis    | localhost:6379                |

O endpoint `/health` verifica a conectividade com PostgreSQL e Redis — é o smoke test de que a
stack subiu corretamente.

## Migrations

As migrations rodam dentro do container `backend`:

```bash
docker compose exec backend npm run migration:run
docker compose exec backend npm run migration:generate -- src/database/migrations/NomeDaMigration
docker compose exec backend npm run migration:revert
```

A primeira migration (`EnablePostgisExtension`) habilita as extensions `postgis` e `uuid-ossp`.

## Lint e formatação

```bash
docker compose exec backend npm run lint
docker compose exec backend npm run format
docker compose exec frontend npm run lint
docker compose exec frontend npm run format
```

## Testes

```bash
# Unitários (não dependem de infraestrutura)
docker compose exec backend npm run test

# E2E (dependem de Postgres e Redis, já disponíveis via compose)
docker compose exec backend npm run test:e2e
```

## Estrutura do projeto

```text
backend/    NestJS — monólito modular (auth, users, artists, events, interests,
            payments, tickets, recommendations, rate-limit, queues, database, redis)
frontend/   React + Vite
docker-compose.yml
.env.example
```

## Avaliação experimental

Os experimentos de carga e concorrência (Token Bucket e índice GiST) e seus resultados estão em
[`backend/load-tests/`](backend/load-tests/) — ver `README.md` e `RESULTS.md` naquela pasta para
como reproduzir e para os números obtidos. A discussão desses resultados também está na monografia
(link acima).
