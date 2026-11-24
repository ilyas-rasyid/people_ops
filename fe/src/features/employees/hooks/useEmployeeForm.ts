import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import type { Employee, Department, Position } from "../../../shared/types/domain";

export type EmployeeFormValues = {
  fullName: string;
  employeeCode: string;
  workEmail: string;
  phoneNumber: string;
  joinDate: string;
  departmentId: string;
  positionId: string;
  managerId: string;
  accountRole: string;
  createAccount: boolean;
};

const initialValues: EmployeeFormValues = {
  fullName: "",
  employeeCode: "",
  workEmail: "",
  phoneNumber: "",
  joinDate: "",
  departmentId: "",
  positionId: "",
  managerId: "",
  accountRole: "EMPLOYEE",
  createAccount: false,
};

export function useEmployeeForm(employeeId?: string) {
  const navigate = useNavigate();
  const [form, setForm] = useState<EmployeeFormValues>(initialValues);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<Department[]>("/departments"),
  });
  const positions = useQuery({
    queryKey: ["positions"],
    queryFn: () => api<Position[]>("/positions"),
  });
  const managers = useQuery({
    queryKey: ["manager-options"],
    queryFn: () => api<{ items: Employee[]; }>("/employees?pageSize=100"),
  });
  const employee = useQuery({
    queryKey: ["employee", employeeId],
    enabled: Boolean(employeeId),
    queryFn: () => api<Employee>(`/employees/${employeeId}`),
  });

  useEffect(() => {
    const record = employee.data;
    if (!record) return;
    setForm({
      fullName: record.fullName,
      employeeCode: record.employeeCode,
      workEmail: record.workEmail,
      phoneNumber: record.phoneNumber ?? "",
      joinDate: record.joinDate.slice(0, 10),
      departmentId: record.departmentId,
      positionId: record.positionId,
      managerId: record.managerId ?? "",
      createAccount: false,
      accountRole: "EMPLOYEE",
    });
  }, [employee.data]);

  const mutation = useMutation({
    mutationFn: () =>
      employeeId
        ? api<Employee>(`/employees/${employeeId}`, {
          method: "PATCH",
          body: {
            fullName: form.fullName,
            workEmail: form.workEmail,
            phoneNumber: form.phoneNumber || null,
            departmentId: form.departmentId,
            positionId: form.positionId,
            managerId: form.managerId || null,
            expectedVersion: employee.data!.version,
          },
        })
        : api<Employee & { temporaryPassword?: string; }>("/employees", {
          method: "POST",
          idempotent: true,
          body: {
            ...form,
            phoneNumber: form.phoneNumber || null,
            managerId: form.managerId || null,
          },
        }),
    onSuccess: (result) => {
      if ("temporaryPassword" in result && result.temporaryPassword) {
        window.alert(
          `One-time temporary password: ${result.temporaryPassword}\nCopy it now; it will not be shown again.`,
        );
      }
      navigate(`/app/employees/${result.id}`);
    },
  });

  function update<K extends keyof EmployeeFormValues>(name: K, value: EmployeeFormValues[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return { form, update, departments, positions, managers, employee, mutation };
}

export type EmployeeFormState = ReturnType<typeof useEmployeeForm>;
