import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Route, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

export interface RotaDistancia {
  id: string;
  origem: string;
  destino: string;
  distanciaKm: number;
}

export function buscarDistancia(origem: string, destino: string, rotas: RotaDistancia[]): number | null {
  const rota = rotas.find(
    (r) =>
      (r.origem.toLowerCase() === origem.toLowerCase() && r.destino.toLowerCase() === destino.toLowerCase()) ||
      (r.origem.toLowerCase() === destino.toLowerCase() && r.destino.toLowerCase() === origem.toLowerCase())
  );
  return rota ? rota.distanciaKm : null;
}

export default function BancoDistancias() {
  const { toast } = useToast();
  const [rotas, setRotas] = useState<RotaDistancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRota, setEditingRota] = useState<RotaDistancia | null>(null);
  const [form, setForm] = useState({ origem: "", destino: "", distanciaKm: "" });

  const mapRow = (r: Record<string, unknown>): RotaDistancia => ({
    id: String(r.id),
    origem: (r.origem as string) || '',
    destino: (r.destino as string) || '',
    // backend pode retornar distanciaKm (camelCase da coluna) ou distancia_km
    distanciaKm: Number(r.distanciaKm ?? r.distancia_km) || 0,
  });

  // Load rotas via REST API
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Record<string, unknown>[]>('/banco-distancias');
        setRotas((data || []).map(mapRow));
      } catch (error) {
        console.error('Erro ao buscar rotas:', error);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rotas.filter(
    (r) =>
      r.origem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destino.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        origem: form.origem,
        destino: form.destino,
        distanciaKm: parseFloat(form.distanciaKm),
      };

      if (editingRota) {
        const { data: row } = await api.patch<Record<string, unknown>>(
          `/banco-distancias/${editingRota.id}`,
          payload
        );
        setRotas((prev) => prev.map((r) => r.id === editingRota.id ? mapRow(row) : r));
        toast({ title: "Rota atualizada!" });
      } else {
        const { data: row } = await api.post<Record<string, unknown>>('/banco-distancias', payload);
        setRotas((prev) => [mapRow(row), ...prev]);
        toast({ title: "Rota cadastrada!" });
      }
      setModalOpen(false);
      setEditingRota(null);
      setForm({ origem: "", destino: "", distanciaKm: "" });
    } catch (error) {
      console.error("Erro ao salvar rota:", error);
      toast({ title: "Erro", description: "Falha ao salvar rota", variant: "destructive" });
    }
  };

  const handleEdit = (r: RotaDistancia) => {
    setEditingRota(r);
    setForm({ origem: r.origem, destino: r.destino, distanciaKm: r.distanciaKm.toString() });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/banco-distancias/${id}`);
      setRotas((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Rota excluída" });
    } catch (error) {
      console.error("Erro ao deletar rota:", error);
      toast({ title: "Erro", description: "Falha ao deletar rota", variant: "destructive" });
    }
  };

  const openNew = () => {
    setEditingRota(null);
    setForm({ origem: "", destino: "", distanciaKm: "" });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Banco de Distâncias</h1>
          <p className="page-description">Rotas pré-cadastradas para cálculo automático de KM morto</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />Nova Rota
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{rotas.length}</p>
            <p className="text-sm text-muted-foreground">Total de rotas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{new Set(rotas.flatMap((r) => [r.origem, r.destino])).size}</p>
            <p className="text-sm text-muted-foreground">Localidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{Math.round(rotas.reduce((s, r) => s + r.distanciaKm, 0) / rotas.length)} km</p>
            <p className="text-sm text-muted-foreground">Distância média</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por origem ou destino..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>Origem</TableHead>
                <TableHead></TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Distância (km)</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rota) => (
                <TableRow key={rota.id} className="data-table-row">
                  <TableCell className="font-medium">{rota.origem}</TableCell>
                  <TableCell><ArrowLeftRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  <TableCell className="font-medium">{rota.destino}</TableCell>
                  <TableCell className="font-mono font-bold">{rota.distanciaKm} km</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rota)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rota.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRota ? "Editar Rota" : "Nova Rota"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Origem *</Label>
              <Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Ex: Recife (Garagem)" required />
            </div>
            <div className="space-y-2">
              <Label>Destino *</Label>
              <Input value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ex: Porto de Galinhas" required />
            </div>
            <div className="space-y-2">
              <Label>Distância (km) *</Label>
              <Input type="number" step="0.1" value={form.distanciaKm} onChange={(e) => setForm({ ...form, distanciaKm: e.target.value })} placeholder="Ex: 65" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingRota ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
