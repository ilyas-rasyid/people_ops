import { describe, expect, it } from "vitest";
import { calculateAnnualBalance, isValidLeaveTransition } from "./leave-balance.policy";

describe("annual leave accounting", () => {
  it("reserves pending leave without debiting committed balance", () => {
    const balance = calculateAnnualBalance(
      [{ eventType: "GRANT", deltaDays: 12 }],
      [{ status: "ACTIVE", reservedDays: 3 }],
    );
    expect(balance.officialRemaining).toBe(12);
    expect(balance.available).toBe(9);
    expect(balance.reserved).toBe(3);
  });
  it("consumes reservation and debits balance exactly once", () => {
    const balance = calculateAnnualBalance(
      [
        { eventType: "GRANT", deltaDays: 12 },
        { eventType: "DEBIT", deltaDays: -3 },
      ],
      [{ status: "CONSUMED", reservedDays: 3 }],
    );
    expect(balance.officialRemaining).toBe(9);
    expect(balance.available).toBe(9);
    expect(balance.reserved).toBe(0);
  });
  it("refund restores the available balance", () => {
    const balance = calculateAnnualBalance(
      [
        { eventType: "GRANT", deltaDays: 12 },
        { eventType: "DEBIT", deltaDays: -3 },
        { eventType: "REFUND", deltaDays: 3 },
      ],
      [],
    );
    expect(balance.available).toBe(12);
  });
});

describe("leave state machine", () => {
  it("permits pending approvals and rejects terminal reactivation", () => {
    expect(isValidLeaveTransition("PENDING", "APPROVED")).toBe(true);
    expect(isValidLeaveTransition("APPROVED", "CANCELLED")).toBe(true);
    expect(isValidLeaveTransition("REJECTED", "PENDING")).toBe(false);
    expect(isValidLeaveTransition("CANCELLED", "APPROVED")).toBe(false);
  });
});
