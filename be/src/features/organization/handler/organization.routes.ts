import { route } from "../../../commons/routing/router";
import {
  listOrganization,
  createOrganization,
  updateOrganization,
  changeOrganizationStatus,
} from "../service/organization.service";

type OrganizationEntity = "department" | "position";

function entityRoutes(entity: OrganizationEntity) {
  const segment = entity === "department" ? "departments" : "positions";

  return [
    route("GET", `/api/v1/${segment}`, "HR", async () => listOrganization(entity)),
    route("POST", `/api/v1/${segment}`, "HR", (ctx) => createOrganization(entity, ctx), true),
    route("PATCH", `/api/v1/${segment}/:id`, "HR", (ctx) => updateOrganization(entity, ctx)),
    route("POST", `/api/v1/${segment}/:id/:action`, "HR", (ctx) => changeOrganizationStatus(entity, ctx)),
  ];
}

export const organizationRoutes = [...entityRoutes("department"), ...entityRoutes("position")];
