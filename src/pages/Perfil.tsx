import { useState } from "react";
import { User, Mail, Briefcase, Shield, Key, Save, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

export default function Perfil() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const roleBadge: Record<string, { label: string; cls: string }> = {
    administrador: { label: "Administrador", cls: "bg-red-100 text-red-800" },
    editor: { label: "Monitor", cls: "bg-blue-100 text-blue-800" },
    portaria: { label: "Portaria", cls: "bg-green-100 text-green-800" },
  };

  const { label: roleLabel, cls: roleCls } = roleBadge[user?.role || "portaria"] || { label: user?.role || "—", cls: "" };

  const handleAlterarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: "Nova senha e confirmação não coincidem", variant: "destructive" });
      return;
    }
    if (novaSenha.length < 6) {
      toast({ title: "A nova senha deve ter ao menos 6 caracteres", variant: "destructive" });
      return;
    }

    setSalvando(true);
    try {
      await api.post('/auth/alterar-senha', {
        id: user?.id,
        senhaAtual,
        novaSenha,
      });

      toast({ title: "Senha alterada com sucesso!" });
      setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : "Erro ao alterar senha");
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const iniciais = (user?.nome || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Visualize seus dados e altere sua senha</p>
      </div>

      {/* Avatar + info principal */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold flex-shrink-0">
              {iniciais}
            </div>
            <div className="space-y-2 min-w-0">
              <h2 className="text-xl font-bold truncate">{user?.nome || "—"}</h2>
              <Badge className={`${roleCls} hover:${roleCls}`}>{roleLabel}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da conta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Dados da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Nome
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium">
                {user?.nome || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> E-mail
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium">
                {user?.email || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Cargo
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium">
                {user?.cargo || "—"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Perfil de Acesso
              </Label>
              <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-medium capitalize">
                {user?.role || "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <div className="relative">
              <Input
                type={showSenhaAtual ? "text" : "password"}
                placeholder="Digite sua senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSenhaAtual((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input
                type={showNovaSenha ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
            {confirmarSenha && novaSenha !== confirmarSenha && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          <Button
            onClick={handleAlterarSenha}
            disabled={salvando || !senhaAtual || !novaSenha || !confirmarSenha || novaSenha !== confirmarSenha}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar Nova Senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
