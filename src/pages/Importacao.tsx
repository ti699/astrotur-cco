import { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  File,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ImportedFile {
  name: string;
  size: number;
  status: "pending" | "processing" | "success" | "error";
  records?: number;
  errors?: string[];
}

const mockPreviewData = [
  {
    data: "25/03/2025",
    hora: "18:00",
    cliente: "JEEP",
    tipo: "SOCORRO",
    veiculo: "101256",
    status: "Válido",
  },
  {
    data: "25/03/2025",
    hora: "14:14",
    cliente: "JEEP",
    tipo: "SOCORRO",
    veiculo: "102104",
    status: "Válido",
  },
  {
    data: "24/03/2025",
    hora: "15:25",
    cliente: "VILA GALÉ",
    tipo: "QUEBRA",
    veiculo: "101318",
    status: "Válido",
  },
  {
    data: "24/03/2025",
    hora: "10:25",
    cliente: "",
    tipo: "ATRASO",
    veiculo: "304",
    status: "Erro: Cliente vazio",
  },
  {
    data: "23/03/2025",
    hora: "09:00",
    cliente: "HDH",
    tipo: "INFORMAÇÃO",
    veiculo: "2408",
    status: "Válido",
  },
];

export default function Importacao() {
  const { toast } = useToast();
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter((file) => {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      return validTypes.includes(file.type) || file.name.match(/\.(xlsx|xls|csv)$/i);
    });

    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: "Arquivo inválido",
        description: "Apenas arquivos Excel (.xlsx, .xls) e CSV são aceitos.",
        variant: "destructive",
      });
    }

    const newFiles: ImportedFile[] = validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    
    if (validFiles.length > 0) {
      setShowPreview(true);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setShowPreview(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);

    // Simular progresso
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setImportProgress(i);
    }

    setFiles((prev) =>
      prev.map((file) => ({
        ...file,
        status: "success",
        records: Math.floor(Math.random() * 100) + 10,
      }))
    );

    setIsImporting(false);
    toast({
      title: "Importação concluída!",
      description: "Os dados foram importados com sucesso.",
    });
  };

  const downloadTemplate = () => {
    toast({
      title: "Download iniciado",
      description: "O modelo de planilha está sendo baixado...",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Importação de Dados</h1>
          <p className="page-description">
            Importe dados via planilhas Excel ou CSV
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Modelo
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload de Arquivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Importar Planilha</h3>
            <p className="text-muted-foreground mb-6">
              Arraste uma planilha Excel (.xlsx) ou CSV para fazer upload
              <br />
              ou clique para selecionar um arquivo
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              multiple
            />
            <label htmlFor="file-upload">
              <Button asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivos
                </span>
              </Button>
            </label>
          </div>

          {/* Instruções */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📋 Instruções:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Certifique-se que a planilha contém as colunas necessárias</li>
              <li>• Os dados serão mapeados automaticamente</li>
              <li>• Você poderá revisar antes de confirmar a importação</li>
              <li>• Duplicatas serão identificadas e podem ser ignoradas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Arquivos Selecionados */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Arquivos Selecionados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <File className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                      {file.records && ` • ${file.records} registros`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {file.status === "pending" && (
                    <Badge variant="secondary">Pendente</Badge>
                  )}
                  {file.status === "processing" && (
                    <Badge className="bg-blue-100 text-blue-800">Processando...</Badge>
                  )}
                  {file.status === "success" && (
                    <Badge className="bg-green-100 text-green-800 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Importado
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge className="bg-red-100 text-red-800 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Erro
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={isImporting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importando...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview dos Dados */}
      {showPreview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Prévia dos Dados</CardTitle>
            <div className="flex gap-2">
              <Badge variant="secondary">{mockPreviewData.length} registros</Badge>
              <Badge className="bg-green-100 text-green-800">
                {mockPreviewData.filter((d) => d.status === "Válido").length} válidos
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                {mockPreviewData.filter((d) => d.status !== "Válido").length} com erro
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPreviewData.map((row, index) => (
                  <TableRow key={index} className="data-table-row">
                    <TableCell className="font-mono">{row.data}</TableCell>
                    <TableCell className="font-mono">{row.hora}</TableCell>
                    <TableCell>{row.cliente || <span className="text-red-500">—</span>}</TableCell>
                    <TableCell>{row.tipo}</TableCell>
                    <TableCell className="font-mono">#{row.veiculo}</TableCell>
                    <TableCell>
                      {row.status === "Válido" ? (
                        <Badge className="bg-green-100 text-green-800 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Válido
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {row.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Botões de Ação */}
      {showPreview && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {
              setFiles([]);
              setShowPreview(false);
            }}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>Importando...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Confirmar Importação
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
