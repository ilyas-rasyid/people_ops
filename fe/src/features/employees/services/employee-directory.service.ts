import { api } from "../../../shared/api/client";
import type { Department, Employee, PageResult } from "../../../shared/types/domain";

export const employeeDirectoryService = {
  departments: () => api<Department[]>("/departments"),

  async list(search: string, departmentId: string, status: string, page: number) {
    const query = new URLSearchParams({
      search,
      departmentId,
      status,
      page: String(page),
      pageSize: "20",
    });
    return api<PageResult<Employee>>(`/employees?${query}`);
  },

  async team(search: string) {
    const employees = await api<Employee[]>("/team");
    const filtered = employees.filter((employee) =>
      employee.fullName.toLowerCase().includes(search.toLowerCase()),
    );
    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      pageSize: 100,
    } satisfies PageResult<Employee>;
  },
};
