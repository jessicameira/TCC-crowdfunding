const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const FIXTURES_PATH = path.join(__dirname, 'fixtures.json');

async function main() {
  if (!fs.existsSync(FIXTURES_PATH)) {
    console.log('Nenhum fixtures.json encontrado — nada para limpar.');
    return;
  }

  const { artistId, eventId } = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'tcc_eventos',
  });
  await client.connect();

  await client.query('DELETE FROM event_interests WHERE "eventId" = $1', [eventId]);
  await client.query('DELETE FROM events WHERE id = $1', [eventId]);
  await client.query('DELETE FROM artists WHERE id = $1', [artistId]);
  const deleted = await client.query(
    `DELETE FROM users WHERE email LIKE 'load-test-%@example.com'`,
  );

  console.log(`Limpeza concluída: evento, artista e ${deleted.rowCount} usuários removidos.`);

  await client.end();
  fs.unlinkSync(FIXTURES_PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
