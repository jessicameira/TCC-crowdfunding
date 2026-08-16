import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventsLocationGistIndex1786857282744 implements MigrationInterface {
  name = 'AddEventsLocationGistIndex1786857282744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_events_location_gist" ON "events" USING GIST ("location")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_events_location_gist"');
  }
}
