import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { employeeDirectoryService } from "../services/employee-directory.service";

export function useEmployeeDirectory(team: boolean) {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: employeeDirectoryService.departments,
    enabled: !team,
  });

  const employees = useQuery({
    queryKey: [team ? "team" : "employees", search, departmentId, status, page],
    queryFn: () =>
      team
        ? employeeDirectoryService.team(search)
        : employeeDirectoryService.list(search, departmentId, status, page),
  });

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function changeDepartment(value: string) {
    setDepartmentId(value);
    setPage(1);
  }

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return {
    employees,
    departments,
    search,
    departmentId,
    status,
    page,
    setPage,
    changeSearch,
    changeDepartment,
    changeStatus,
  };
}
