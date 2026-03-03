import jsPDF from "jspdf";
import logoAstrotur from "@/assets/logo-astrotur.png";

export interface RelatorioPDFConfig {
  titulo: string;
  subtitulo?: string;
  periodo?: { inicio: string; fim: string };
  resumo?: { label: string; valor: string }[];
  colunas: string[];
  dados: string[][];
  geradoPor?: string;
  imagemUrl?: string;
}

// Convert logo to base64 for PDF
let logoBase64: string | null = null;
const loadLogo = (): Promise<string> => {
  if (logoBase64) return Promise.resolve(logoBase64);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      logoBase64 = canvas.toDataURL("image/png");
      resolve(logoBase64);
    };
    img.onerror = () => resolve("");
    img.src = logoAstrotur;
  });
};

export async function gerarRelatorioPDF(config: RelatorioPDFConfig) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const logo = await loadLogo();

  const addPageNumber = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  };

  // Header - Vermelho Astrotur #d92323 = RGB(217, 35, 35)
  doc.setFillColor(217, 35, 35);
  doc.rect(0, 0, pageWidth, 44, "F");

  // Logo
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 10, 4, 28, 12);
    } catch {}
  }

  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GRUPO ASTROTUR - SISTEMA CCO", pageWidth / 2, 14, { align: "center" });
  doc.setFontSize(11);
  doc.text(config.titulo, pageWidth / 2, 22, { align: "center" });
  
  // Endereço
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Av. Dr. José Rufino, 151 - Jiquiá, Recife - PE - 50771-600", pageWidth / 2, 29, { align: "center" });

  doc.setFontSize(8);
  const now = new Date();
  const geradoEm = `Gerado em: ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const periodoText = config.periodo ? `Período: ${config.periodo.inicio} a ${config.periodo.fim}` : "";
  const geradoPor = config.geradoPor ? `Gerado por: ${config.geradoPor}` : "";
  const subLine = [periodoText, geradoEm, geradoPor].filter(Boolean).join("  |  ");
  doc.text(subLine, pageWidth / 2, 36, { align: "center" });

  y = 52;

  // Imagem da avaria (se houver)
  if (config.imagemUrl) {
    try {
      doc.addImage(config.imagemUrl, "JPEG", margin, y, 60, 45);
      y += 50;
    } catch {}
  }

  // Resumo cards
  if (config.resumo && config.resumo.length > 0) {
    doc.setTextColor(217, 35, 35);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO", margin, y);
    y += 6;

    const cardWidth = contentWidth / Math.min(config.resumo.length, 4);
    config.resumo.forEach((item, i) => {
      const x = margin + (i % 4) * cardWidth;
      const row = Math.floor(i / 4);
      const cardY = y + row * 18;
      doc.setFillColor(240, 242, 245);
      doc.roundedRect(x + 1, cardY, cardWidth - 2, 16, 2, 2, "F");
      doc.setTextColor(100);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, x + cardWidth / 2, cardY + 6, { align: "center" });
      doc.setTextColor(217, 35, 35);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(item.valor, x + cardWidth / 2, cardY + 13, { align: "center" });
    });
    y += Math.ceil(config.resumo.length / 4) * 18 + 6;
  }

  // Table
  if (config.colunas.length > 0 && config.dados.length > 0) {
    doc.setTextColor(217, 35, 35);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DETALHADOS", margin, y);
    y += 6;

    const colCount = config.colunas.length;
    const colWidth = contentWidth / colCount;
    const rowHeight = 8;

    // Header row - Vermelho
    doc.setFillColor(217, 35, 35);
    doc.rect(margin, y, contentWidth, rowHeight, "F");
    doc.setTextColor(255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    config.colunas.forEach((col, i) => {
      doc.text(col.toUpperCase(), margin + i * colWidth + 2, y + 5.5);
    });
    y += rowHeight;

    let currentPage = 1;
    doc.setFont("helvetica", "normal");
    config.dados.forEach((row, rowIndex) => {
      if (y + rowHeight > pageHeight - 20) {
        addPageNumber(currentPage, 0);
        doc.addPage();
        currentPage++;
        y = margin;
        doc.setFillColor(217, 35, 35);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
        doc.setTextColor(255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        config.colunas.forEach((col, i) => {
          doc.text(col.toUpperCase(), margin + i * colWidth + 2, y + 5.5);
        });
        y += rowHeight;
        doc.setFont("helvetica", "normal");
      }

      const isEven = rowIndex % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 249, 250);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }
      doc.setTextColor(50);
      doc.setFontSize(7);
      row.forEach((cell, i) => {
        const text = (cell || "").substring(0, 30);
        doc.text(text, margin + i * colWidth + 2, y + 5.5);
      });
      y += rowHeight;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageNumber(i, totalPages);
    }
  }

  doc.save(`${config.titulo.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

export function gerarFichaMotorista(motorista: {
  nome: string;
  matricula: string;
  tempoEmpresa: string;
  totalAvarias: number;
  cobradas: number;
  abonadas: number;
  advertencias: number;
  totalCobrado: number;
  dais: { talao: string; data: string; tipo: string; valor: string; decisao: string; desconto: string }[];
}) {
  const config: RelatorioPDFConfig = {
    titulo: `Ficha de Conduta - ${motorista.nome}`,
    subtitulo: `Matrícula: ${motorista.matricula}`,
    resumo: [
      { label: "Tempo na Empresa", valor: motorista.tempoEmpresa },
      { label: "Total Avarias", valor: motorista.totalAvarias.toString() },
      { label: "Cobradas", valor: motorista.cobradas.toString() },
      { label: "Abonadas", valor: motorista.abonadas.toString() },
      { label: "Advertências", valor: motorista.advertencias.toString() },
      { label: "Total Cobrado", valor: `R$ ${motorista.totalCobrado.toFixed(2)}` },
    ],
    colunas: ["Talão", "Data", "Tipo", "Valor", "Decisão", "Desconto"],
    dados: motorista.dais.map((d) => [d.talao, d.data, d.tipo, d.valor, d.decisao, d.desconto]),
    geradoPor: "SISTEMA CCO",
  };
  gerarRelatorioPDF(config);
}
