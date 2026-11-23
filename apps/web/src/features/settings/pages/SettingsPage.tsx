import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton, TextField, SelectField } from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import { readableDate } from "../../../shared/lib/format";

type Settings = {
  id: string;
  name: string;
  timezone: string;
  defaultAnnualDays: number;
  version: number;
};
type Schedule = {
  id: string;
  effectiveFrom: string;
  workingDays: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
};
type Holiday = { id: string; date: string; name: string; status: string };
const tabs = [
  { label: "Company", href: "/app/settings/company" },
  { label: "Work calendar", href: "/app/settings/work-calendar" },
  { label: "Leave policy", href: "/app/settings/leave-policy" },
];

export function SettingsPage() {
  const { pathname } = useLocation();
  const section = pathname.endsWith("work-calendar")
    ? "calendar"
    : pathname.endsWith("leave-policy")
      ? "policy"
      : "company";
  const settings = useQuery({
    queryKey: ["settings", "company"],
    queryFn: () => api<Settings>("/settings/company"),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Company settings"
        description="Manage company information, working days, and leave policy."
      />
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          {tabs.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={pathname === item.href ? "settings-link active" : "settings-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <section className="panel panel-pad">
          {settings.isLoading ? (
            <LoadingState />
          ) : settings.error ? (
            <ErrorState error={settings.error} />
          ) : (
            settings.data &&
            (section === "company" ? (
              <CompanyEditor value={settings.data} />
            ) : section === "policy" ? (
              <PolicyEditor value={settings.data} />
            ) : (
              <CalendarEditor />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function CompanyEditor({ value }: { value: Settings }) {
  const cache = useQueryClient();
  const [name, setName] = useState(value.name);
  const save = useMutation({
    mutationFn: () => api("/settings/company", { method: "PATCH", body: { name } }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["settings"] }),
  });
  return (
    <div className="form-stack">
      <div>
        <h2 className="form-section-title">Company information</h2>
        <p className="muted-text">These details represent your single-company workspace.</p>
      </div>
      <TextField label="Company name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField
        label="Company timezone"
        disabled
        value={value.timezone}
        hint="The timezone is locked after business history is recorded."
      />
      {save.error && <ErrorState error={save.error} />}
      {save.isSuccess && <p className="success-message">Company information updated.</p>}
      <div className="form-actions">
        <PrimaryButton
          onClick={() => save.mutate()}
          disabled={save.isPending || name.trim().length < 2}
        >
          Save changes
        </PrimaryButton>
      </div>
    </div>
  );
}

function PolicyEditor({ value }: { value: Settings }) {
  const cache = useQueryClient();
  const [days, setDays] = useState(value.defaultAnnualDays);
  const save = useMutation({
    mutationFn: () =>
      api("/settings/leave-policy", {
        method: "PATCH",
        body: { defaultAnnualDays: days },
      }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["settings"] }),
  });
  return (
    <div className="form-stack">
      <div>
        <h2 className="form-section-title">Annual leave policy</h2>
        <p className="muted-text">
          The default allocation applies to new annual entitlements. Existing committed balances are
          not changed automatically.
        </p>
      </div>
      <TextField
        label="Default annual leave days"
        type="number"
        min={0}
        max={365}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      />
      {save.error && <ErrorState error={save.error} />}
      {save.isSuccess && <p className="success-message">Leave policy saved.</p>}
      <div className="form-actions">
        <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
          Save policy
        </PrimaryButton>
      </div>
    </div>
  );
}

function CalendarEditor() {
  const cache = useQueryClient();
  const schedules = useQuery({
    queryKey: ["work-schedules"],
    queryFn: () => api<Schedule[]>("/settings/work-schedules"),
  });
  const holidays = useQuery({
    queryKey: ["holidays"],
    queryFn: () => api<Holiday[]>("/settings/holidays"),
  });
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: () =>
      api("/settings/holidays", {
        method: "POST",
        body: { date, name },
        idempotent: true,
      }),
    onSuccess: () => {
      setDate("");
      setName("");
      void cache.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
  return (
    <div className="form-stack">
      <h2 className="form-section-title">Work calendar</h2>
      <p className="muted-text">
        Working hours are versioned; historical attendance keeps its original schedule.
      </p>
      <h3 className="subsection-title">Current schedules</h3>
      <div className="simple-list">
        {schedules.data?.map((s) => (
          <div className="simple-list-item" key={s.id}>
            <span className="simple-list-copy">
              <strong>
                {s.startTime}–{s.endTime}
              </strong>
              <small>
                Effective {readableDate(s.effectiveFrom)} · {s.graceMinutes}-minute grace
              </small>
            </span>
          </div>
        ))}
      </div>
      <h3 className="subsection-title">Company holidays</h3>
      <div className="simple-list">
        {holidays.data
          ?.filter((h) => h.status === "ACTIVE")
          .map((h) => (
            <div className="simple-list-item" key={h.id}>
              <strong>{h.name}</strong>
              <span className="muted-text">{readableDate(h.date)}</span>
            </div>
          ))}
      </div>
      <div className="form-grid">
        <TextField label="Holiday name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Holiday date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {add.error && <ErrorState error={add.error} />}
      <div className="form-actions">
        <PrimaryButton disabled={!name || !date || add.isPending} onClick={() => add.mutate()}>
          Add holiday
        </PrimaryButton>
      </div>
    </div>
  );
}
