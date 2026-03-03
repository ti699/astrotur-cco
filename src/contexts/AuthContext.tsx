import { createContext, useContext, useState, type ReactNode } from "react";
import api from "@/services/api";

export type UserRole = "administrador" | "editor" | "portaria";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  cargo?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  hasAccess: (allowedRoles: UserRole[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "@SistemaCCO:user";
const TOKEN_KEY = "@SistemaCCO:token";

// Mapeia os perfis do backend para os roles do frontend
function mapPerfil(perfil: string): UserRole {
  if (perfil === "administrador") return "administrador";
  if (perfil === "monitor" || perfil === "editor") return "editor";
  return "portaria";
}

// Tenta recuperar o usuário salvo na sessão anterior
function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(loadStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

// Credenciais de demonstração — funcionam sem backend
const DEMO_USERS: Record<string, { nome: string; role: UserRole; cargo: string; password: string }> = {
  "admin@sistemacco.com": { password: "admin123", nome: "Administrador", role: "administrador", cargo: "Gestor" },
  "monitor@sistemacco.com": { password: "monitor123", nome: "Monitor CCO", role: "editor", cargo: "Monitor" },
  "portaria@sistemacco.com": { password: "portaria123", nome: "Portaria", role: "portaria", cargo: "Porteiro" },
};

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const backendUser = data.user;
      const token: string = data.token;

      const authUser: AuthUser = {
        id: String(backendUser.id),
        nome: backendUser.nome,
        email: backendUser.email,
        role: mapPerfil(backendUser.perfil),
        cargo: backendUser.cargo,
      };

      localStorage.setItem(TOKEN_KEY, token);
      setUser(authUser);
    } catch (apiError) {
      // Backend indisponível → testa credenciais de demonstração
      const demo = DEMO_USERS[email.toLowerCase()];
      if (demo && demo.password === password) {
        const authUser: AuthUser = {
          id: "demo-" + email,
          nome: demo.nome,
          email,
          role: demo.role,
          cargo: demo.cargo,
        };
        localStorage.setItem(TOKEN_KEY, "demo-token");
        setUser(authUser);
      } else {
        throw new Error("Credenciais inválidas. Use admin@sistemacco.com / admin123");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    window.location.href = "/login";
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, hasAccess, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
