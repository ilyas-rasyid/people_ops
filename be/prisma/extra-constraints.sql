-- Apply after the initial Prisma migration using a reviewed migration in deployment.
-- For development: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/prisma/extra-constraints.sql
CREATE UNIQUE INDEX IF NOT EXISTS "Department_active_name_unique"
  ON "Department" (lower("normalizedName")) WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS "Position_active_title_unique"
  ON "Position" (lower("normalizedTitle")) WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_email_lower_unique"
  ON "Employee" (lower("workEmail"));
ALTER TABLE "LeaveRequest" DROP CONSTRAINT IF EXISTS "LeaveRequest_dates_ordered";
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_dates_ordered"
  CHECK ("endDate" >= "startDate" AND "requestedDays" > 0);
ALTER TABLE "LeaveBalanceLedger" DROP CONSTRAINT IF EXISTS "LeaveBalanceLedger_delta_nonzero";
ALTER TABLE "LeaveBalanceLedger" ADD CONSTRAINT "LeaveBalanceLedger_delta_nonzero"
  CHECK ("deltaDays" <> 0);
ALTER TABLE "LeaveReservation" DROP CONSTRAINT IF EXISTS "LeaveReservation_reserved_positive";
ALTER TABLE "LeaveReservation" ADD CONSTRAINT "LeaveReservation_reserved_positive"
  CHECK ("reservedDays" > 0);
