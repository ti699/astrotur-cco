import { useState } from "react";
import {
  Plus, Search, Edit, Trash2, Eye, Phone, User as UserIcon, Building2,
} from "lucide-react";
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

interface Cliente {
  id: number;
  nomeEmpresa: string;
  nomeResponsavel: string;
  cpf: string;
  telefone: string;
  email: string;
  slaHoras: number;
  slaNivel: string;
  slaRequisitos: string;
  multaDescumprimento: number;
  ativo: boolean;
}

const mockClientes: Cliente[] = [
  { id: 1, nomeEmpresa: "JEEP", nomeResponsavel: "Carlos Silva", cpf: "123.456.789-00", telefone: "(81) 99999-1111", email: "carlos@jeep.com.br", slaHoras: 2, slaNivel: "ALTO", slaRequisitos: "Ar-condicionado obrigatório. Veículo com no máximo 3 anos de uso. Motorista treinado.", multaDescumprimento: 5000, ativo: true },
  { id: 2, nomeEmpresa: "VILA GALÉ", nomeResponsavel: "Maria Santos", cpf: "234.567.890-11", telefone: "(81) 99999-2222", email: "maria@vilagale.com.br", slaHoras: 3, slaNivel: "ALTO", slaRequisitos: "Ar-condicionado obrigatório. Bancos reclináveis.", multaDescumprimento: 3000, ativo: true },
  { id: 3, nomeEmpresa: "HDH", nomeResponsavel: "João Pereira", cpf: "345.678.901-22", telefone: "(81) 99999-3333", email: "joao@hdh.com.br", slaHoras: 2, slaNivel: "MÉDIO", slaRequisitos: "Veículo em bom estado. Pontualidade rigorosa.", multaDescumprimento: 2000, ativo: true },
  { id: 4, nomeEmpresa: "CBA", nomeResponsavel: "Ana Costa", cpf: "456.789.012-33", telefone: "(81) 99999-4444", email: "ana@cba.com.br", slaHoras: 4, slaNivel: "MÉDIO", slaRequisitos: "Nenhum requisito especial.", multaDescumprimento: 1500, ativo: true },
];

const emptyForm = { nomeEmpresa: "", nomeResponsavel: "", cpf: "", telefone: "", email: "", slaHoras: 2, slaNivel: "MÉDIO", slaRequisitos: "", multaDescumprimento: 0 };

export default function Clientes() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const filteredClientes = clientes.filter((c) =>
    c.nomeResponsavel.toLowerCase().includes(searchTerm.toLowerCase()) || c.nomeEmpresa.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf.includes(searchTerm) || c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCliente) {
      setClientes((prev) => prev.map((c) => c.id === editingCliente.id ? { ...c, ...formData } : c));
      toast({ title: "Cliente atualizado!", description: `${formData.nomeEmpresa} atualizado.` });
    } else {
      setClientes((prev) => [...prev, { id: Date.now(), ...formData, ativo: true }]);
      toast({ title: "Cliente cadastrado!", description: `${formData.nomeEmpresa} adicionado.` });
    }
    setModalOpen(false);
    setEditingCliente(null);
    setFormData(emptyForm);
  };

  const handleEdit = (c: Cliente) => {
    setEditingCliente(c);
    setFormData({ nomeEmpresa: c.nomeEmpresa, nomeResponsavel: c.nomeResponsavel, cpf: c.cpf, telefone: c.telefone, email: c.email, slaHoras: c.slaHoras, slaNivel: c.slaNivel, slaRequisitos: c.slaRequisitos, multaDescumprimento: c.multaDescumprimento });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Cliente excluído" });
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
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{clientes.filter((c) => c.slaNivel === "ALTO").length}</p><p className="text-sm text-muted-foreground">SLA Alto</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por empresa, nome, CPF ou email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Empresa</TableHead><TableHead>Responsável</TableHead><TableHead>CPF</TableHead><TableHead>Contato</TableHead><TableHead>SLA</TableHead><TableHead>Multa</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredClientes.map((c) => (
              <TableRow key={c.id} className="data-table-row">
                <TableCell className="font-semibold"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{c.nomeEmpresa}</div></TableCell>
                <TableCell><div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" />{c.nomeResponsavel}</div></TableCell>
                <TableCell className="font-mono text-sm">{c.cpf}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" />{c.telefone}</div></TableCell>
                <TableCell><Badge className={c.slaNivel === "ALTO" ? "bg-red-100 text-red-800" : c.slaNivel === "MÉDIO" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>{c.slaNivel} ({c.slaHoras}h)</Badge></TableCell>
                <TableCell className="font-mono text-sm">R$ {c.multaDescumprimento.toLocaleString()}</TableCell>
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
            <div className="space-y-2"><Label>Nome da Empresa *</Label><Input value={formData.nomeEmpresa} onChange={(e) => setFormData({ ...formData, nomeEmpresa: e.target.value })} placeholder="Ex: JEEP, VILA GALÉ..." required /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome do Responsável *</Label><Input value={formData.nomeResponsavel} onChange={(e) => setFormData({ ...formData, nomeResponsavel: e.target.value })} required /></div>
              <div className="space-y-2"><Label>CPF *</Label><Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" required /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Telefone</Label><Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">SLA e Contrato</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Tempo Resposta (h)</Label><Input type="number" min={1} value={formData.slaHoras} onChange={(e) => setFormData({ ...formData, slaHoras: parseInt(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Nível SLA</Label><Select value={formData.slaNivel} onValueChange={(v) => setFormData({ ...formData, slaNivel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALTO">Alto</SelectItem><SelectItem value="MÉDIO">Médio</SelectItem><SelectItem value="BAIXO">Baixo</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Multa (R$)</Label><Input type="number" value={formData.multaDescumprimento} onChange={(e) => setFormData({ ...formData, multaDescumprimento: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2 mt-4"><Label>Requisitos Contratuais</Label><Textarea value={formData.slaRequisitos} onChange={(e) => setFormData({ ...formData, slaRequisitos: e.target.value })} placeholder="Ex: Ar-condicionado obrigatório, veículo máx. 3 anos..." rows={3} /></div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingCliente ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedCliente?.nomeEmpresa}</DialogTitle></DialogHeader>
          {selectedCliente && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase">Empresa</p><p className="font-semibold">{selectedCliente.nomeEmpresa}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Responsável</p><p>{selectedCliente.nomeResponsavel}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">CPF</p><p className="font-mono">{selectedCliente.cpf}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Telefone</p><p>{selectedCliente.telefone}</p></div>
                <div className="col-span-2"><p className="text-xs text-muted-foreground uppercase">Email</p><p>{selectedCliente.email}</p></div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">SLA e Contrato</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground uppercase">Nível</p><Badge className={selectedCliente.slaNivel === "ALTO" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{selectedCliente.slaNivel}</Badge></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Tempo</p><p className="font-bold">{selectedCliente.slaHoras}h</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase">Multa</p><p className="font-mono font-bold text-destructive">R$ {selectedCliente.multaDescumprimento.toLocaleString()}</p></div>
                </div>
                <div className="mt-3"><p className="text-xs text-muted-foreground uppercase">Requisitos</p><p className="text-sm mt-1 bg-muted p-3 rounded-lg">{selectedCliente.slaRequisitos || "Nenhum"}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
