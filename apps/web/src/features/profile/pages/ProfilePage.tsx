import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { Employee } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton, Panel, TextField } from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import { readableDate } from "../../../shared/lib/format";

export function ProfilePage() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api<Employee>("/me/profile"),
  });
  const [phone, setPhone] = useState("");
  useEffect(() => {
    setPhone(query.data?.phoneNumber ?? "");
  }, [query.data]);
  const save = useMutation({
    mutationFn: () =>
      api("/me/profile/contact", {
        method: "PATCH",
        body: { phoneNumber: phone || null },
      }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["me", "profile"] }),
  });
  return (
    <div className="page-fade narrow-page">
      <PageHeader
        eyebrow="MY WORKSPACE / PROFILE"
        title="My profile"
        description="View your employment information and contact details."
      />
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} />
      ) : (
        query.data && (
          <div className="form-stack">
            <Panel title="Employment information">
              <div className="detail-grid">
                <div className="detail-field">
                  <span>Full name</span>
                  <strong>{query.data.fullName}</strong>
                </div>
                <div className="detail-field">
                  <span>Employee ID</span>
                  <strong>{query.data.employeeCode}</strong>
                </div>
                <div className="detail-field">
                  <span>Work email</span>
                  <strong>{query.data.workEmail}</strong>
                </div>
                <div className="detail-field">
                  <span>Joined</span>
                  <strong>{readableDate(query.data.joinDate)}</strong>
                </div>
              </div>
            </Panel>
            <section className="panel panel-pad">
              <h2 className="form-section-title">Contact information</h2>
              <TextField
                label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              {save.error && <ErrorState error={save.error} />}
              {save.isSuccess && <p className="success-message">Contact details saved.</p>}
              <div className="form-actions">
                <PrimaryButton onClick={() => save.mutate()} disabled={save.isPending}>
                  Save changes
                </PrimaryButton>
              </div>
            </section>
            <Link to="/app/account/security" className="security-link">
              <ShieldCheck size={18} />
              Account security and password <span>→</span>
            </Link>
          </div>
        )
      )}
    </div>
  );
}
