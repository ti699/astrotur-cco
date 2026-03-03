import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportarCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  colunasEsperadas: string[];
  onImportar: (dados: Record<string, string>[]) => void;
}

export function ImportarCSVDialog({
  open,
  onOpenChange,
  titulo,
  colunasEsperadas,
  onImportar,
}: ImportarCSVDialogProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dados, setDados] = useState<Record<string, string>[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<string>("");

  const handleBaixarModelo = () => {
    const csv = colunasEsperadas.join(";") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo_${titulo.toLowerCase().replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        setErros(["Arquivo vazio ou sem dados."]);
        return;
      }

      const separator = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0].split(separator).map((h) => h.trim().replace(/"/g, ""));
      
      const errosLocal: string[] = [];
      const missing = colunasEsperadas.filter(
        (c) => !headers.some((h) => h.toLowerCase() === c.toLowerCase())
      );
      if (missing.length > 0) {
        errosLocal.push(`Colunas faltando: ${missing.join(", ")}`);
      }

      const parsed: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(separator).map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });
        parsed.push(row);
      }

      setErros(errosLocal);
      setDados(parsed);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleConfirmar = () => {
    onImportar(dados);
    toast({
      title: "Importação concluída!",
      description: `${dados.length} registro(s) importado(s) com sucesso.`,
    });
    setDados([]);
    setErros([]);
    setArquivo("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setDados([]);
    setErros([]);
    setArquivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar {titulo}</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com os dados para importação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-auto">
          {/* Modelo */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Modelo CSV</p>
                <p className="text-xs text-muted-foreground">
                  Colunas: {colunasEsperadas.join(", ")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleBaixarModelo}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo
            </Button>
          </div>

          {/* Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {arquivo ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{arquivo}</span>
                <Badge variant="secondary">{dados.length} registros</Badge>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste o arquivo CSV
                </p>
              </>
            )}
            <Input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-3 max-w-xs mx-auto"
            />
          </div>

          {/* Erros */}
          {erros.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              {erros.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {dados.length > 0 && erros.length === 0 && (
            <div className="border rounded-lg overflow-auto max-h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(dados[0]).map((h) => (
                      <TableHead key={h} className="text-xs whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((v, j) => (
                        <TableCell key={j} className="text-xs py-1.5">
                          {v}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dados.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ... e mais {dados.length - 10} registros
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={dados.length === 0 || erros.length > 0}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Importar {dados.length > 0 ? `(${dados.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
