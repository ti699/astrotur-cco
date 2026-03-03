import { useState } from "react";
import { Plus, Search, Edit, Trash2, UserCog, Shield, Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: string;
  perfil: "administrador" | "editor" | "portaria";
  ativo: boolean;
}

const mockUsuarios: Usuario[] = [
  { id: 1, nome: "Administrador", email: "admin@sistemacco.com", cargo: "Administrador", perfil: "administrador", ativo: true },
  { id: 2, nome: "Anderson Silva", email: "anderson@sistemacco.com", cargo: "Supervisor", perfil: "editor", ativo: true },
  { id: 3, nome: "Iranildo Costa", email: "iranildo@sistemacco.com", cargo: "Plantonista", perfil: "portaria", ativo: true },
  { id: 4, nome: "Valdomiro Santos", email: "valdomiro@sistemacco.com", cargo: "Supervisor", perfil: "editor", ativo: true },
  { id: 5, nome: "Macário Lima", email: "macario@sistemacco.com", cargo: "Porteiro", perfil: "portaria", ativo: true },
];

const perfilLabels: Record<string, string> = { administrador: "Administrador", editor: "Editor", portaria: "Portaria" };
const perfilColors: Record<string, string> = { administrador: "bg-purple-100 text-purple-800", editor: "bg-blue-100 text-blue-800", portaria: "bg-green-100 text-green-800" };
const perfilDescriptions: Record<string, string> = {
  administrador: "Acesso total ao sistema",
  editor: "Visualiza e edita dados operacionais",
  portaria: "Apenas módulo de portaria",
};

export default function Usuarios() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>(mockUsuarios);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({ nome: "", email: "", cargo: "", perfil: "portaria" as Usuario["perfil"], senha: "", ativo: true });

  const filteredUsuarios = usuarios.filter((u) =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUsuario) {
      setUsuarios((prev) => prev.map((u) => u.id === editingUsuario.id ? { ...u, ...formData } : u));
      toast({ title: "Usuário atualizado!" });
    } else {
      setUsuarios((prev) => [...prev, { id: Date.now(), ...formData }]);
      toast({ title: "Usuário cadastrado!" });
    }
    setModalOpen(false);
    setEditingUsuario(null);
    setFormData({ nome: "", email: "", cargo: "", perfil: "portaria", senha: "", ativo: true });
  };

  const handleEdit = (u: Usuario) => {
    setEditingUsuario(u);
    setFormData({ nome: u.nome, email: u.email, cargo: u.cargo, perfil: u.perfil, senha: "", ativo: u.ativo });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => { setUsuarios((prev) => prev.filter((u) => u.id !== id)); toast({ title: "Usuário excluído" }); };
  const openNewModal = () => { setEditingUsuario(null); setFormData({ nome: "", email: "", cargo: "", perfil: "portaria", senha: "", ativo: true }); setModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="page-title">Usuários</h1><p className="page-description">Gerencie usuários e controle de acesso</p></div>
        <Button size="sm" onClick={openNewModal}><Plus className="mr-2 h-4 w-4" />Novo Usuário</Button>
      </div>

      {/* Role descriptions */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {(["administrador", "editor", "portaria"] as const).map((role) => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={perfilColors[role]}>{perfilLabels[role]}</Badge>
                <span className="text-lg font-bold">{usuarios.filter((u) => u.perfil === role).length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{perfilDescriptions[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card><CardContent className="p-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nome ou email..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow className="data-table-header"><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Cargo</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredUsuarios.map((u) => (
              <TableRow key={u.id} className="data-table-row">
                <TableCell className="font-semibold">{u.nome}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" />{u.email}</div></TableCell>
                <TableCell>{u.cargo}</TableCell>
                <TableCell><Badge className={perfilColors[u.perfil]}>{perfilLabels[u.perfil]}</Badge></TableCell>
                <TableCell>{u.ativo ? <Badge className="bg-green-100 text-green-800">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} disabled={u.perfil === "administrador"}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingUsuario ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cargo</Label><Input value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} /></div>
              <div className="space-y-2"><Label>Perfil de Acesso *</Label>
                <Select value={formData.perfil} onValueChange={(v: Usuario["perfil"]) => setFormData({ ...formData, perfil: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador - Acesso total</SelectItem>
                    <SelectItem value="editor">Editor - Visualiza e edita</SelectItem>
                    <SelectItem value="portaria">Portaria - Apenas portaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingUsuario && <div className="space-y-2"><Label>Senha *</Label><Input type="password" value={formData.senha} onChange={(e) => setFormData({ ...formData, senha: e.target.value })} required={!editingUsuario} /></div>}
            <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={formData.ativo} onCheckedChange={(c) => setFormData({ ...formData, ativo: c })} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingUsuario ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
