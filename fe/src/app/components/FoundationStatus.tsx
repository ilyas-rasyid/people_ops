import { ArrowUpRight } from "lucide-react";

type FoundationStatusProps = {
  label: string;
  detail: string;
};

export function FoundationStatus({ label, detail }: FoundationStatusProps) {
  return (
    <div className="foundation-item">
      <div className="foundation-item-top">
        <span className="foundation-label">{label}</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </div>
      <p className="foundation-detail">{detail}</p>
    </div>
  );
}
