import type { LeaveBalance } from "../../../shared/types/domain";
export function LeaveBalanceSummary({ balance }: { balance: LeaveBalance }) {
  const items = [
    { label: "Available", value: balance.available, emphasis: true },
    { label: "Allocated", value: balance.allocated },
    { label: "Used", value: balance.netUsed },
    { label: "Reserved", value: balance.reserved },
  ];
  return (
    <div className="balance-grid">
      {items.map((item) => (
        <div key={item.label} className={`balance-item ${item.emphasis ? "balance-primary" : ""}`}>
          <span>{item.label}</span>
          <strong>
            {item.value}
            <small> days</small>
          </strong>
        </div>
      ))}
    </div>
  );
}
