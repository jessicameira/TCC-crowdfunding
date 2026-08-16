import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsTable1786859236358 implements MigrationInterface {
  name = 'CreatePaymentsTable1786859236358';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL REFERENCES "events"("id"),
        "userId" uuid NOT NULL REFERENCES "users"("id"),
        "amountCents" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "externalId" varchar(255) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_externalId" UNIQUE ("externalId"),
        CONSTRAINT "UQ_payments_event_user" UNIQUE ("eventId", "userId"),
        CONSTRAINT "CHK_payments_amount_non_negative" CHECK ("amountCents" >= 0),
        CONSTRAINT "CHK_payments_status_valid" CHECK ("status" IN (
          'PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'
        ))
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_payments_eventId" ON "payments" ("eventId")');
    await queryRunner.query('CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "payments"');
  }
}
