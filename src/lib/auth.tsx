import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api, { clearAuthStorage, storeTokens } from "./api";

export interface User {
  id: string;
  name: string;
  owner: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  useEffect(() => {
    if (token && !user) {
      api
        .get<unknown, User>("/me")
        .then((data) => {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          clearAuthStorage();
        });
    }
  }, [token, user]);

  const login = async (password: string) => {
    const pair = await api.post<unknown, { accessToken: string; refreshToken: string }>(
      "/auth/owner-login",
      { password },
    );
    // 先存 token：下面的 /me 由拦截器带上它
    storeTokens(pair);
    const me = await api.get<unknown, User>("/me");
    localStorage.setItem("user", JSON.stringify(me));
    setUser(me);
    setToken(pair.accessToken);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    clearAuthStorage();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
