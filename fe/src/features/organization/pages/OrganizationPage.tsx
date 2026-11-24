import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { Department, Position } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton, SecondaryButton } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { LoadingState, ErrorState, EmptyState } from "../../../shared/components/Feedback";
import { Modal } from "../../../shared/components/Modal";

export function OrganizationPage({ type }: { type: "departments" | "positions"; }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const cache = useQueryClient();
  const singular = type === "departments" ? "Department" : "Position";
  const query = useQuery({
    queryKey: [type],
    queryFn: () => api<(Department | Position)[]>(`/${type}`),
  });
  const create = useMutation({
    mutationFn: () =>
      api(`/${type}`, {
        method: "POST",
        idempotent: true,
        body: type === "departments" ? { name } : { title: name },
      }),
    onSuccess: () => {
      setOpen(false);
      setName("");
      void cache.invalidateQueries({ queryKey: [type] });
    },
  });
  const archive = useMutation({
    mutationFn: (id: string) =>
      api(`/${type}/${id}/archive`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: [type] }),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="ORGANIZATION"
        title={type === "departments" ? "Departments" : "Positions"}
        description={
          type === "departments"
            ? "Organize your people into clear teams and functions."
            : "Maintain consistent job titles across the company."
        }
        action={
          <PrimaryButton onClick={() => setOpen(true)}>
            <Plus size={17} /> Add {singular.toLowerCase()}
          </PrimaryButton>
        }
      />
      <section className="panel">
        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data?.length ? (
          <EmptyState />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{singular}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{"name" in item ? item.name : item.title}</strong>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      {item.status === "ACTIVE" && (
                        <button
                          className="table-action"
                          onClick={() => {
                            if (window.confirm(`Archive this ${singular.toLowerCase()}?`))
                              archive.mutate(item.id);
                          }}
                          aria-label={`Archive ${singular}`}
                        >
                          <Archive size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {archive.error && <ErrorState error={archive.error} />}
      </section>
      {open && (
        <Modal
          title={`Add ${singular.toLowerCase()}`}
          onClose={() => setOpen(false)}
          footer={
            <>
              <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton
                disabled={name.trim().length < 2 || create.isPending}
                onClick={() => create.mutate()}
              >
                Create {singular.toLowerCase()}
              </PrimaryButton>
            </>
          }
        >
          <label className="field">
            <span className="field-label">{singular} name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {create.error && <ErrorState error={create.error} />}
        </Modal>
      )}
    </div>
  );
}
