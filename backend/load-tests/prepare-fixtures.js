const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const USER_COUNT = 300;
const OUTPUT_PATH = path.join(__dirname, 'fixtures.json');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tcc_eventos',
  });
  await client.connect();

  const artistRes = await client.query(
    `INSERT INTO artists (name, description, location)
     VALUES ('Artista de Teste de Carga', null, ST_SetSRID(ST_MakePoint(-49.27,-25.42),4326)::geography)
     RETURNING id`,
  );
  const artistId = artistRes.rows[0].id;

  const eventRes = await client.query(
    `INSERT INTO events (
       "artistId", name, description, "eventDate", capacity, "minimumQuorum",
       "priceCents", "currentInterest", location, status
     ) VALUES (
       $1, 'Evento de Teste de Carga', null, now() + interval '30 days', 1000000, 999999,
       0, 0, ST_SetSRID(ST_MakePoint(-49.27,-25.42),4326)::geography, 'OPEN'
     ) RETURNING id`,
    [artistId],
  );
  const eventId = eventRes.rows[0].id;

  const userIds = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const res = await client.query(
      `INSERT INTO users (name, email, "passwordHash") VALUES ($1, $2, $3) RETURNING id`,
      [`Carga ${i}`, `load-test-${i}@example.com`, 'unused-in-load-test'],
    );
    userIds.push(res.rows[0].id);
  }

  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
  const tokens = userIds.map((id, i) =>
    jwt.sign({ sub: id, email: `load-test-${i}@example.com` }, secret),
  );

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ artistId, eventId, tokens }, null, 2));

  console.log(`Fixtures prontas: artistId=${artistId} eventId=${eventId} usuarios=${tokens.length}`);
  console.log(`Escrito em ${OUTPUT_PATH}`);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
