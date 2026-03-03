import { useState, useMemo } from "react";
import {
  Plus, Search, Edit, Trash2, Eye, Phone, User as UserIcon, Building2, Loader2,
} from "lucide-react";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente, type Cliente } from "@/services/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { nome: "", contato: "", cnpj: "", email: "", sla_horas: 2, sla_nivel: "MÉDIO", sla_requisitos: "" };

export default function Clientes() {
  const { toast } = useToast();
  const { data: clientesData, isLoading } = useClientes();
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();
  const clientes: Cliente[] = clientesData ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const filteredClientes = useMemo(() => clientes.filter((c) =>
    (c.nome ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contato ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cnpj ?? "").includes(searchTerm) ||
    (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  ), [clientes, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCliente) {
      updateCliente.mutate({ id: editingCliente.id, ...formData }, {
        onSuccess: () => { toast({ title: "Cliente atualizado!", description: `${formData.nome} atualizado.` }); setModalOpen(false); setEditingCliente(null); setFormData(emptyForm); },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      });
    } else {
      createCliente.mutate(formData, {
        onSuccess: () => { toast({ title: "Cliente cadastrado!", description: `${formData.nome} adicionado.` }); setModalOpen(false); setFormData(emptyForm); },
        onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (c: Cliente) => {
    setEditingCliente(c);
    setFormData({ nome: c.nome ?? "", contato: c.contato ?? "", cnpj: c.cnpj ?? "", email: c.email ?? "", sla_horas: c.sla_horas ?? 2, sla_nivel: c.sla_nivel ?? "MÉDIO", sla_requisitos: c.sla_requisitos ?? "" });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteCliente.mutate(id, {
      onSuccess: () => toast({ title: "Cliente excluído" }),
      onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
    });
  };

  const openNewModal = () => { setEditingCliente(null); setFormData(emptyForm); setModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Clientes e Contratos</h1><p className="page-description">Gerencie clientes, SLAs e multas contratuais</p></div>
        <Button size="sm" onClick={openNewModal}><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{clientes.length}</p><p className="text-sm text-muted-foreground">Total de clientes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-600">{clientes.filter((c) => c.ativo).length}</p><p className="text-sm text-muted-foreground">Ativos</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{clientes.filter((c) => c.sla_nivel === "ALTO").length}</p><p className="text-sm text-muted-foreground">SLA Alto</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por empresa, nome, CPF ou email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Empresa</TableHead><TableHead>Responsável</TableHead><TableHead>CPF</TableHead><TableHead>Contato</TableHead><TableHead>SLA</TableHead><TableHead>Multa</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredClientes.map((c) => (
              <TableRow key={c.id} className="data-table-row">
                <TableCell className="font-semibold"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{c.nome}</div></TableCell>
                <TableCell><div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" />{c.contato}</div></TableCell>
                <TableCell className="font-mono text-sm">{c.cnpj}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{c.email}</div></TableCell>
                <TableCell><Badge className={c.sla_nivel === "ALTO" ? "bg-red-100 text-red-800" : c.sla_nivel === "MÉDIO" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>{c.sla_nivel} ({c.sla_horas}h)</Badge></TableCell>
                <TableCell>{c.ativo ? <Badge className="bg-green-100 text-green-800">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedCliente(c); setDetailsOpen(true); }}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome da Empresa *</Label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: JEEP, VILA GALÉ..." required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contato / Responsável</Label><Input value={formData.contato} onChange={(e) => setFormData({ ...formData, contato: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">SLA e Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Tempo Resposta (h)</Label><Input type="number" min={1} value={formData.sla_horas} onChange={(e) => setFormData({ ...formData, sla_horas: parseInt(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Nível SLA</Label><Select value={formData.sla_nivel} onValueChange={(v) => setFormData({ ...formData, sla_nivel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALTO">Alto</SelectItem><SelectItem value="MÉDIO">Médio</SelectItem><SelectItem value="BAIXO">Baixo</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2 mt-4"><Label>Requisitos Contratuais</Label><Textarea value={formData.sla_requisitos} onChange={(e) => setFormData({ ...formData, sla_requisitos: e.target.value })} placeholder="Ex: Ar-condicionado obrigatório, veículo máx. 3 anos..." rows={3} /></div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCliente.isPending || updateCliente.isPending}>{editingCliente ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedCliente?.nome}</DialogTitle></DialogHeader>
          {selectedCliente && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase">Empresa</p><p className="font-semibold">{selectedCliente.nome}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Contato</p><p>{selectedCliente.contato}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground uppercase">Email</p><p>{selectedCliente.email}</p></div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">SLA e Contrato</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground uppercase">Nível</p><Badge className={selectedCliente.sla_nivel === "ALTO" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{selectedCliente.sla_nivel}</Badge></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Tempo</p><p className="font-bold">{selectedCliente.sla_horas}h</p></div>
                </div>
                <div className="mt-3"><p className="text-xs text-muted-foreground uppercase">Requisitos</p><p className="text-sm mt-1 bg-muted p-3 rounded-lg">{selectedCliente.sla_requisitos || "Nenhum"}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
