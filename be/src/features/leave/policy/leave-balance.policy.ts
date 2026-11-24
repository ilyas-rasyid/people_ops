export type LedgerEffect = { eventType: string; deltaDays: number; };
export type ReservationEffect = { status: string; reservedDays: number; };

export function calculateAnnualBalance(events: LedgerEffect[], reservations: ReservationEffect[]) {
  const allocated = events
    .filter((entry) => ["GRANT", "ADJUSTMENT"].includes(entry.eventType))
    .reduce((sum, entry) => sum + entry.deltaDays, 0);
  const netUsed = -events
    .filter((entry) => ["DEBIT", "REFUND"].includes(entry.eventType))
    .reduce((sum, entry) => sum + entry.deltaDays, 0);
  const reserved = reservations
    .filter((entry) => entry.status === "ACTIVE")
    .reduce((sum, entry) => sum + entry.reservedDays, 0);
  return {
    allocated,
    netUsed,
    officialRemaining: allocated - netUsed,
    reserved,
    available: allocated - netUsed - reserved,
  };
}

export function isValidLeaveTransition(from: string, to: string) {
  return (
    (from === "PENDING" && ["APPROVED", "REJECTED", "CANCELLED"].includes(to)) ||
    (from === "APPROVED" && to === "CANCELLED")
  );
}
