import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1786854373268 implements MigrationInterface {
  name = 'CreateEventsTable1786854373268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "artistId" uuid NOT NULL REFERENCES "artists"("id"),
        "name" varchar(255) NOT NULL,
        "description" text,
        "eventDate" timestamptz NOT NULL,
        "capacity" integer NOT NULL,
        "minimumQuorum" integer NOT NULL,
        "currentInterest" integer NOT NULL DEFAULT 0,
        "location" geography(Point,4326) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_events_capacity_positive" CHECK ("capacity" > 0),
        CONSTRAINT "CHK_events_minimum_quorum_positive" CHECK ("minimumQuorum" > 0),
        CONSTRAINT "CHK_events_minimum_quorum_lte_capacity" CHECK ("minimumQuorum" <= "capacity"),
        CONSTRAINT "CHK_events_current_interest_bounds" CHECK ("currentInterest" >= 0 AND "currentInterest" <= "capacity"),
        CONSTRAINT "CHK_events_status_valid" CHECK ("status" IN (
          'DRAFT', 'OPEN', 'QUORUM_REACHED', 'CONFIRMED', 'CANCELLED', 'SOLD_OUT', 'COMPLETED'
        ))
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_events_artistId" ON "events" ("artistId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "events"');
  }
}
