import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Ocorrencias from "./pages/Ocorrencias";
import NovaOcorrencia from "./pages/NovaOcorrencia";
import Portaria from "./pages/Portaria";
import Avarias from "./pages/Avarias";
import Manutencao from "./pages/Manutencao";
import Abastecimento from "./pages/Abastecimento";
import Veiculos from "./pages/cadastros/Veiculos";
import Motoristas from "./pages/cadastros/Motoristas";
import Clientes from "./pages/cadastros/Clientes";
import TiposQuebra from "./pages/cadastros/TiposQuebra";
import Usuarios from "./pages/cadastros/Usuarios";
import Relatorios from "./pages/Relatorios";
import Importacao from "./pages/Importacao";
import Configuracoes from "./pages/Configuracoes";
import BancoDistancias from "./pages/BancoDistancias";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas — exigem autenticação */}
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portaria" element={<Portaria />} />
              <Route path="/manutencao" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Manutencao /></ProtectedRoute>} />
              <Route path="/abastecimento" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Abastecimento /></ProtectedRoute>} />
              <Route path="/ocorrencias" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Ocorrencias /></ProtectedRoute>} />
              <Route path="/ocorrencias/nova" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><NovaOcorrencia /></ProtectedRoute>} />
              <Route path="/avarias" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Avarias /></ProtectedRoute>} />
              <Route path="/cadastros/veiculos" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Veiculos /></ProtectedRoute>} />
              <Route path="/cadastros/motoristas" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Motoristas /></ProtectedRoute>} />
              <Route path="/cadastros/clientes" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Clientes /></ProtectedRoute>} />
              <Route path="/cadastros/tipos-quebra" element={<ProtectedRoute allowedRoles={["administrador"]}><TiposQuebra /></ProtectedRoute>} />
              <Route path="/cadastros/usuarios" element={<ProtectedRoute allowedRoles={["administrador"]}><Usuarios /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["administrador", "editor"]}><Relatorios /></ProtectedRoute>} />
              <Route path="/importacao" element={<ProtectedRoute allowedRoles={["administrador"]}><Importacao /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={["administrador"]}><Configuracoes /></ProtectedRoute>} />
              <Route path="/banco-distancias" element={<ProtectedRoute allowedRoles={["administrador"]}><BancoDistancias /></ProtectedRoute>} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
