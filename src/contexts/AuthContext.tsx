import { createContext, useContext, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Verifica credenciais via PostgreSQL RPC (bcrypt no servidor)
      const { data, error } = await supabase.rpc('auth_login', {
        p_email: email.toLowerCase().trim(),
        p_password: password,
      });

      if (error) throw new Error(error.message);
      if (!data || data.error) throw new Error(data?.message ?? 'Credenciais inválidas');

      const authUser: AuthUser = {
        id: String(data.id),
        nome: data.nome,
        email: data.email,
        role: mapPerfil(data.perfil),
        cargo: data.cargo,
      };

      localStorage.setItem(TOKEN_KEY, 'sb-' + Date.now());
      setUser(authUser);
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
