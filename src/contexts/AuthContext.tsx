import { createContext, useContext, useState, type ReactNode } from "react";
import api from "@/services/api";

export type UserRole = "administrador" | "editor" | "portaria";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  cargo?: string;
  empresa_id: number;
  empresa?: {
    id: number;
    nome: string;
    slug: string;
    plano?: string;
  };
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const emailNorm = email.toLowerCase().trim();

      const { data } = await api.post<{ user: Record<string, unknown>; token: string }>(
        '/auth/login',
        { email: emailNorm, password }
      );

      const u = data.user;
      const authUser: AuthUser = {
        id:         String(u.id),
        nome:       u.nome as string,
        email:      u.email as string,
        role:       mapPerfil(u.perfil as string),
        cargo:      u.cargo as string | undefined,
        empresa_id: u.empresa_id as number,
        empresa:    u.empresa as AuthUser['empresa'],
      };

      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(authUser);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Erro ao fazer login');
      throw new Error(msg);
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
