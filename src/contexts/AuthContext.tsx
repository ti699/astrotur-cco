import { createContext, useContext, useState, type ReactNode } from "react";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

// Usuários de emergência (espelho do backend Express)
// Senha: admin123
const EMERGENCY_USERS = [
  { id: "1", nome: "Administrador", email: "admin@sistemacco.com", senha: "admin123", cargo: "Administrador", perfil: "administrador" },
  { id: "2", nome: "Usuário Teste",  email: "teste@teste.com",      senha: "admin123", cargo: "Monitor",        perfil: "monitor" },
  { id: "3", nome: "Teste Usuario",  email: "teste@usuario.com",    senha: "admin123", cargo: "Operador",       perfil: "editor" },
];

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
      const emailNorm = email.toLowerCase().trim();

      // === 1ª tentativa: consulta direta na tabela usuarios ===
      try {
        const { data: rows } = await supabase
          .from('usuarios')
          .select('id, nome, email, perfil, cargo, senha')
          .eq('ativo', true)
          .ilike('email', emailNorm)
          .limit(1);

        if (rows && rows.length > 0) {
          const u = rows[0];

          // Verifica senha: bcrypt (hash $2a/$2b) ou plain-text
          let senhaOk = false;
          if (u.senha && u.senha.startsWith('$2')) {
            senhaOk = await bcrypt.compare(password, u.senha);
          } else {
            senhaOk = u.senha === password;
          }

          if (senhaOk) {
            const authUser: AuthUser = {
              id: String(u.id),
              nome: u.nome,
              email: u.email,
              role: mapPerfil(u.perfil),
              cargo: u.cargo,
            };
            localStorage.setItem(TOKEN_KEY, 'sb-' + Date.now());
            setUser(authUser);
            return;
          }

          // Usuário encontrado mas senha errada
          throw new Error('Senha incorreta. Verifique suas credenciais.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        // Se foi senha errada, não tenta fallback de emergência
        if (msg.startsWith('Senha incorreta')) throw err;
        // Caso contrário (tabela não existe, RLS bloqueando, etc) continua para emergência
      }

      // === 2ª tentativa: usuários de emergência hardcoded ===
      const emergencyUser = EMERGENCY_USERS.find(
        (u) => u.email === emailNorm && u.senha === password
      );
      if (emergencyUser) {
        const authUser: AuthUser = {
          id: emergencyUser.id,
          nome: emergencyUser.nome,
          email: emergencyUser.email,
          role: mapPerfil(emergencyUser.perfil),
          cargo: emergencyUser.cargo,
        };
        localStorage.setItem(TOKEN_KEY, 'sb-' + Date.now());
        setUser(authUser);
        return;
      }

      throw new Error('Credenciais inválidas. Tente: admin@sistemacco.com / admin123');
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
