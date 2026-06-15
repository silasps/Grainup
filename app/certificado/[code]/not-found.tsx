import { XCircle } from "lucide-react";

export default function CertificateNotFound() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="font-heading font-bold text-xl text-red-700 mb-2">
          Certificado não encontrado
        </h1>
        <p className="text-sm text-muted-foreground">
          O código informado não corresponde a nenhum certificado em nossa base. Verifique se o código está correto e tente novamente.
        </p>
      </div>
    </div>
  );
}
