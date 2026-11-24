import { api, resetCsrf } from "../../../shared/api/client";

export const authenticationService = {
  async login(email: string, password: string) {
    await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    resetCsrf();
  },
};
