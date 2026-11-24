import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, resetCsrf } from "../../shared/api/client";
import type { SessionUser } from "../../shared/types/domain";

const AuthContext = createContext<{
  user: SessionUser | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode; }) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<SessionUser>("/auth/me").catch(() => null),
    staleTime: 20_000,
    retry: false,
  });
  async function refresh() {
    await cache.invalidateQueries({ queryKey: ["auth"] });
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    resetCsrf();
    cache.clear();
    window.location.href = "/login";
  }
  return (
    <AuthContext.Provider
      value={{ user: query.data ?? null, loading: query.isLoading, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
