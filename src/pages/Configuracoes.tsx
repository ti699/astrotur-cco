import { useState } from "react";
import {
  Settings,
  Bell,
  Mail,
  Shield,
  Database,
  Palette,
  Save,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Configuracoes() {
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  
  // Estados de configurações
  const [notificacoes, setNotificacoes] = useState({
    email: true,
    push: false,
    novaOcorrencia: true,
    atrasos: true,
    finalizacao: true,
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    emailFrom: "noreply@sistemacco.com",
  });

  const handleSave = () => {
    toast({
      title: "Configurações salvas!",
      description: "As alterações foram aplicadas com sucesso.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-description">
            Gerencie as configurações do sistema
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            E-mail
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Configurações Gerais */}
        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Alternar entre tema claro e escuro
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  <Moon className="h-4 w-4" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select defaultValue="pt-BR">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fuso Horário</Label>
                <Select defaultValue="America/Recife">
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Recife">América/Recife (GMT-3)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">América/São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="America/Manaus">América/Manaus (GMT-4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>
                Informações da empresa exibidas nos relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <Input defaultValue="Astrotur Transporte" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input defaultValue="00.000.000/0001-00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input defaultValue="Recife, PE" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Canais de Notificação</CardTitle>
              <CardDescription>
                Escolha como deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba resumos e alertas por e-mail
                  </p>
                </div>
                <Switch
                  checked={notificacoes.email}
                  onCheckedChange={(checked) =>
                    setNotificacoes({ ...notificacoes, email: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações no navegador
                  </p>
                </div>
                <Switch
                  checked={notificacoes.push}
                  onCheckedChange={(checked) =>
                    setNotificacoes({ ...notificacoes, push: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventos de Notificação</CardTitle>
              <CardDescription>
                Selecione quais eventos devem gerar notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Nova ocorrência registrada</Label>
                <Switch
                  checked={notificacoes.novaOcorrencia}
                  onCheckedChange={(checked) =>
                    setNotificacoes({ ...notificacoes, novaOcorrencia: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Ocorrência com atraso</Label>
                <Switch
                  checked={notificacoes.atrasos}
                  onCheckedChange={(checked) =>
                    setNotificacoes({ ...notificacoes, atrasos: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Plantão finalizado</Label>
                <Switch
                  checked={notificacoes.finalizacao}
                  onCheckedChange={(checked) =>
                    setNotificacoes({ ...notificacoes, finalizacao: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-mail */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações SMTP</CardTitle>
              <CardDescription>
                Configure o servidor de e-mail para envio de notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Servidor SMTP</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={emailConfig.smtpHost}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    placeholder="587"
                    value={emailConfig.smtpPort}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="seu-email@gmail.com"
                    value={emailConfig.smtpUser}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpUser: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha / App Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={emailConfig.smtpPass}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpPass: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail de Origem</Label>
                <Input
                  placeholder="noreply@empresa.com"
                  value={emailConfig.emailFrom}
                  onChange={(e) =>
                    setEmailConfig({ ...emailConfig, emailFrom: e.target.value })
                  }
                />
              </div>
              <Button variant="outline">Testar Conexão</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Política de Senhas</CardTitle>
              <CardDescription>
                Configure os requisitos de senha do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tamanho mínimo da senha</Label>
                <Select defaultValue="8">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 caracteres</SelectItem>
                    <SelectItem value="8">8 caracteres</SelectItem>
                    <SelectItem value="10">10 caracteres</SelectItem>
                    <SelectItem value="12">12 caracteres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir caractere especial</Label>
                  <p className="text-sm text-muted-foreground">
                    A senha deve conter pelo menos um caractere especial
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir número</Label>
                  <p className="text-sm text-muted-foreground">
                    A senha deve conter pelo menos um número
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
              <CardDescription>
                Configure o tempo de sessão do usuário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tempo de expiração da sessão</Label>
                <Select defaultValue="24">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="8">8 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="168">7 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
