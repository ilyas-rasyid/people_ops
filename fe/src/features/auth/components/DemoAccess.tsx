import { LockKeyhole } from "lucide-react";

const demoAccounts = [
  { label: "HR Admin", email: "hr@example.com" },
  { label: "Manager", email: "manager@example.com" },
  { label: "Employee", email: "employee@example.com" },
];

export function DemoAccess({ onSelect }: { onSelect: (email: string) => void; }) {
  return (
    <div className="demo-access">
      <div className="demo-access-title">
        <LockKeyhole size={16} />
        Demo access
      </div>
      <p>Use the seeded accounts to explore each role.</p>
      <div className="demo-role-list">
        {demoAccounts.map((account) => (
          <button key={account.email} type="button" onClick={() => onSelect(account.email)}>
            <span>{account.label}</span>
            <span>{account.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
