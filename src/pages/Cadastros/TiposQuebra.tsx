import { useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface TipoQuebra {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  createdAt: string;
}

const mockTipos: TipoQuebra[] = [
  {
    id: 1,
    nome: "Suspensão",
    descricao: "Problemas relacionados à suspensão do veículo",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 2,
    nome: "Motor",
    descricao: "Problemas relacionados ao motor",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 3,
    nome: "Elétrica",
    descricao: "Problemas no sistema elétrico",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 4,
    nome: "Lubrificação",
    descricao: "Problemas de lubrificação",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 5,
    nome: "Freios",
    descricao: "Problemas no sistema de freios",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 6,
    nome: "Pneus",
    descricao: "Problemas com pneus (furos, desgaste, etc)",
    ativo: true,
    createdAt: "2025-01-15",
  },
  {
    id: 7,
    nome: "Ar Condicionado",
    descricao: "Problemas com o sistema de ar condicionado",
    ativo: true,
    createdAt: "2025-01-20",
  },
  {
    id: 8,
    nome: "Câmbio",
    descricao: "Problemas na caixa de câmbio",
    ativo: true,
    createdAt: "2025-01-22",
  },
  {
    id: 9,
    nome: "Outros",
    descricao: "Outros tipos de ocorrências",
    ativo: true,
    createdAt: "2025-01-15",
  },
];

export default function TiposQuebra() {
  const { toast } = useToast();
  const [tipos, setTipos] = useState<TipoQuebra[]>(mockTipos);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoQuebra | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
  });

  const filteredTipos = tipos.filter(
    (tipo) =>
      tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTipo) {
      setTipos((prev) =>
        prev.map((t) =>
          t.id === editingTipo.id
            ? { ...t, ...formData }
            : t
        )
      );
      toast({
        title: "Tipo atualizado!",
        description: `${formData.nome} foi atualizado com sucesso.`,
      });
    } else {
      const newTipo: TipoQuebra = {
        id: Math.max(...tipos.map((t) => t.id)) + 1,
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setTipos((prev) => [...prev, newTipo]);
      toast({
        title: "Tipo cadastrado!",
        description: `${formData.nome} foi adicionado com sucesso.`,
      });
    }
    
    setModalOpen(false);
    setEditingTipo(null);
    setFormData({ nome: "", descricao: "", ativo: true });
  };

  const handleEdit = (tipo: TipoQuebra) => {
    setEditingTipo(tipo);
    setFormData({
      nome: tipo.nome,
      descricao: tipo.descricao,
      ativo: tipo.ativo,
    });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setTipos((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Tipo excluído",
      description: "O tipo de quebra foi removido com sucesso.",
    });
  };

  const handleToggleAtivo = (id: number) => {
    setTipos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ativo: !t.ativo } : t))
    );
  };

  const openNewModal = () => {
    setEditingTipo(null);
    setFormData({ nome: "", descricao: "", ativo: true });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tipos de Quebra</h1>
          <p className="page-description">
            Cadastre e gerencie os tipos de quebra/ocorrência
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tipo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{tipos.length}</p>
                <p className="text-sm text-muted-foreground">Total de tipos</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {tipos.filter((t) => t.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {tipos.filter((t) => !t.ativo).length}
                </p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTipos.map((tipo) => (
                <TableRow key={tipo.id} className="data-table-row">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">{tipo.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-sm text-muted-foreground truncate">
                      {tipo.descricao}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tipo.ativo}
                        onCheckedChange={() => handleToggleAtivo(tipo.id)}
                      />
                      {tipo.ativo ? (
                        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(tipo.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tipo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tipo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? "Editar Tipo de Quebra" : "Novo Tipo de Quebra"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Motor, Pneu, Elétrica..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva este tipo de quebra..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo">Ativo</Label>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ativo: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingTipo ? "Salvar Alterações" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
