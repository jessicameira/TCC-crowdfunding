import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketsTable1786859236359 implements MigrationInterface {
  name = 'CreateTicketsTable1786859236359';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL REFERENCES "events"("id"),
        "userId" uuid NOT NULL REFERENCES "users"("id"),
        "paymentId" uuid NOT NULL REFERENCES "payments"("id"),
        "status" varchar(20) NOT NULL DEFAULT 'VALID',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tickets_paymentId" UNIQUE ("paymentId")
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_tickets_eventId" ON "tickets" ("eventId")');
    await queryRunner.query('CREATE INDEX "IDX_tickets_userId" ON "tickets" ("userId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tickets"');
  }
}
