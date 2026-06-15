"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  certificateCode: string;
  studentName:     string;
  courseTitle:     string;
  tenantName:      string;
  issuedAt:        string;
  primaryColor:    string;
}

export function CertificateDownload({
  certificateCode, studentName, courseTitle, tenantName, issuedAt, primaryColor,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const W = 297;
      const H = 210;

      // Background
      doc.setFillColor(248, 248, 248);
      doc.rect(0, 0, W, H, "F");

      // Top accent bar
      const r = parseInt(primaryColor.slice(1, 3), 16) || 27;
      const g = parseInt(primaryColor.slice(3, 5), 16) || 67;
      const b = parseInt(primaryColor.slice(5, 7), 16) || 50;
      doc.setFillColor(r, g, b);
      doc.rect(0, 0, W, 8, "F");
      doc.rect(0, H - 8, W, 8, "F");

      // Border frame
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, W - 24, H - 24);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, W - 28, H - 28);

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(r, g, b);
      doc.text(tenantName.toUpperCase(), W / 2, 30, { align: "center" });

      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text("CERTIFICADO DE CONCLUSÃO", W / 2, 44, { align: "center" });

      // Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("Certificamos que", W / 2, 65, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(r, g, b);
      doc.text(studentName, W / 2, 83, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text("concluiu com êxito o curso", W / 2, 97, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      const titleLines = doc.splitTextToSize(courseTitle, W - 80) as string[];
      doc.text(titleLines, W / 2, 110, { align: "center" });

      // Date + code
      const issued = new Date(issuedAt).toLocaleDateString("pt-BR", {
        day: "numeric", month: "long", year: "numeric",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Emitido em ${issued}`, W / 2, 150, { align: "center" });

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(60, 160, W - 60, 160);

      // Verification code
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Código de verificação: ${certificateCode}`, W / 2, 167, { align: "center" });
      doc.text(
        `Verifique em: ${process.env.NEXT_PUBLIC_APP_URL ?? "grainup.com.br"}/certificado/${certificateCode}`,
        W / 2, 173, { align: "center" }
      );

      doc.save(`certificado-${courseTitle.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Certificado baixado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-1.5"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Gerando PDF…" : "Baixar PDF"}
    </Button>
  );
}
