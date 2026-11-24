import { UsersRound } from "lucide-react";

export function LoginBrandPanel() {
  return (
    <section className="login-brand-panel">
      <div className="login-brand">
        <span className="brand-symbol">
          <UsersRound size={20} />
        </span>
        peopleops<span className="brand-period">.</span>
      </div>
      <div className="login-promo">
        <span className="promo-eyebrow">NORTHSTAR · PEOPLE OPERATIONS</span>
        <h1>
          Good people.
          <br />
          Better work.
        </h1>
        <p>
          A thoughtful workspace for the people behind your business. One place for employee
          records, attendance, and leave.
        </p>
        <div className="promo-stat">
          <div>
            <strong>One workspace</strong>
            <span>Built for clarity</span>
          </div>
          <span className="promo-lines" aria-hidden="true">
            ···
          </span>
        </div>
      </div>
      <div className="login-panel-foot">PeopleOps HRIS · Portfolio demonstration</div>
    </section>
  );
}
