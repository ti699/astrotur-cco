import { useState, useEffect } from "react";
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
import { supabase } from "@/lib/supabase";

interface TipoQuebra {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  createdAt: string;
}
const mockTipos: TipoQuebra[] = [];

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = { ATIVO: "bg-green-100 text-green-800", FERIAS: "bg-blue-100 text-blue-800", AFASTADO: "bg-amber-100 text-amber-800", DESLIGADO: "bg-gray-100 text-gray-800" };
  const labels: Record<string, string> = { ATIVO: "Ativo", FERIAS: "Férias", AFASTADO: "Afastado", DESLIGADO: "Desligado" };
  return <Badge className={`${map[status] || ""} hover:${map[status] || ""}`}>{labels[status] || status}</Badge>;
};

export default function TiposQuebra() {
  const { toast } = useToast();
  const [tipos, setTipos] = useState<TipoQuebra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoQuebra | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
  });

  const mapRow = (r: Record<string, unknown>): TipoQuebra => ({
    id: r.id as number,
    nome: (r.nome as string) || '',
    descricao: (r.descricao as string) || '',
    ativo: Boolean(r.ativo),
    createdAt: (r.created_at as string) || '',
  });

  // Load tipos from Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('tipos_quebra').select('*').order('nome', { ascending: true });
      if (!error) setTipos((data || []).map((r) => mapRow(r as Record<string, unknown>)));
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTipos = tipos.filter(
    (tipo) =>
      tipo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTipo) {
        const { data: row, error } = await supabase
          .from('tipos_quebra')
          .update({ nome: formData.nome, descricao: formData.descricao, ativo: formData.ativo })
          .eq('id', editingTipo.id)
          .select()
          .single();
        if (error) throw error;
        setTipos((prev) => prev.map((t) => t.id === editingTipo.id ? mapRow(row as Record<string, unknown>) : t));
        toast({ title: "Tipo atualizado!", description: `${formData.nome} foi atualizado com sucesso.` });
      } else {
        const { data: row, error } = await supabase
          .from('tipos_quebra')
          .insert({ nome: formData.nome, descricao: formData.descricao, ativo: formData.ativo })
          .select()
          .single();
        if (error) throw error;
        setTipos((prev) => [...prev, mapRow(row as Record<string, unknown>)]);
        toast({ title: "Tipo cadastrado!", description: `${formData.nome} foi adicionado com sucesso.` });
      }
      setModalOpen(false);
      setEditingTipo(null);
      setFormData({ nome: "", descricao: "", ativo: true });
    } catch (error) {
      console.error("Erro ao salvar tipo:", error);
      toast({ title: "Erro", description: "Falha ao salvar tipo", variant: "destructive" });
    }
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

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('tipos_quebra').delete().eq('id', id);
      if (error) throw error;
      setTipos((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Tipo excluído", description: "O tipo de quebra foi removido com sucesso." });
    } catch (error) {
      console.error("Erro ao deletar tipo:", error);
      toast({ title: "Erro", description: "Falha ao deletar tipo", variant: "destructive" });
    }
  };

  const handleToggleAtivo = async (tipo: TipoQuebra) => {
    try {
      const { data: row, error } = await supabase
        .from('tipos_quebra')
        .update({ ativo: !tipo.ativo })
        .eq('id', tipo.id)
        .select()
        .single();
      if (error) throw error;
      setTipos((prev) => prev.map((t) => (t.id === tipo.id ? mapRow(row as Record<string, unknown>) : t)));
    } catch (error) {
      console.error("Erro ao atualizar tipo:", error);
      toast({ title: "Erro", description: "Falha ao atualizar tipo", variant: "destructive" });
    }
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
                        onCheckedChange={() => handleToggleAtivo(tipo)}
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
