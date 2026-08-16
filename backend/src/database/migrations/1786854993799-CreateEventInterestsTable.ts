import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventInterestsTable1786854993799 implements MigrationInterface {
  name = 'CreateEventInterestsTable1786854993799';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_interests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL REFERENCES "events"("id"),
        "userId" uuid NOT NULL REFERENCES "users"("id"),
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_event_interests_event_user" UNIQUE ("eventId", "userId")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_event_interests_eventId" ON "event_interests" ("eventId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_event_interests_userId" ON "event_interests" ("userId")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "event_interests"');
  }
}
