import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventsPriceCents1786859236357 implements MigrationInterface {
  name = 'AddEventsPriceCents1786859236357';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD COLUMN "priceCents" integer NOT NULL DEFAULT 0,
      ADD CONSTRAINT "CHK_events_price_non_negative" CHECK ("priceCents" >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "events" DROP COLUMN "priceCents"');
  }
}
