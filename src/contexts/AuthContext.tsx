import { createContext, useContext, useState, type ReactNode } from "react";
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

      // === 1ª tentativa: função RPC com bcrypt no Supabase ===
      try {
        const { data, error } = await supabase.rpc('auth_login', {
          p_email: emailNorm,
          p_password: password,
        });

        if (!error && data && !data.error) {
          const authUser: AuthUser = {
            id: String(data.id),
            nome: data.nome,
            email: data.email,
            role: mapPerfil(data.perfil),
            cargo: data.cargo,
          };
          localStorage.setItem(TOKEN_KEY, 'sb-' + Date.now());
          setUser(authUser);
          return;
        }

        // Se o RPC retornou "Senha incorreta" ou "não encontrado", não tenta fallback
        if (!error && data && data.error) {
          throw new Error(data.message ?? 'Credenciais inválidas');
        }
      } catch (rpcErr: unknown) {
        // Se o erro for "função não encontrada" no Supabase, continua para fallback
        const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
        if (!msg.includes('Could not find') && !msg.includes('function') && !msg.includes('schema cache') && !msg.includes('does not exist')) {
          throw rpcErr; // re-throw erros reais (senha errada, etc.)
        }
        console.warn('[Auth] RPC auth_login não encontrada, tentando fallback...');
      }

      // === 2ª tentativa: consulta direta na tabela usuarios ===
      try {
        const { data: rows, error: qErr } = await supabase
          .from('usuarios')
          .select('id, nome, email, perfil, cargo, ativo, senha')
          .eq('ativo', true)
          .ilike('email', emailNorm)
          .limit(1);

        if (!qErr && rows && rows.length > 0) {
          const u = rows[0];
          // Verifica senha via RPC simples de bcrypt (se disponível)
          try {
            const { data: ok } = await supabase.rpc('verify_password', {
              plain: password,
              hashed: u.senha,
            });
            if (ok === true) {
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
          } catch {
            // verify_password também não existe — cai no fallback de emergência
          }

          // Se a senha for plain text (ambiente de desenvolvimento / sem bcrypt)
          if (u.senha === password) {
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
        }
      } catch {
        // tabela pode não existir ainda
      }

      // === 3ª tentativa: usuários de emergência (espelho do backend Express) ===
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

      throw new Error('Credenciais inválidas');
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
