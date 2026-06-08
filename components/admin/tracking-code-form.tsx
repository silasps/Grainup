"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateTrackingCodeAction } from "@/app/(admin)/admin/editora/pedidos/actions";
import { toast } from "sonner";
import { Truck } from "lucide-react";

export function TrackingCodeForm({
  orderId,
  initialCode,
}: {
  orderId: string;
  initialCode: string | null;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    const { error } = await updateTrackingCodeAction(orderId, code.trim());
    setLoading(false);
    if (error) {
      toast.error("Erro ao salvar código de rastreio");
    } else {
      toast.success("Código de rastreio salvo");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Código de rastreio</h3>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex: BR123456789BR"
          className="font-mono text-sm h-9"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading}
          className="shrink-0 h-9"
        >
          {loading ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {code && (
        <p className="text-xs text-muted-foreground">
          O cliente verá este código na área de pedidos assim que for salvo.
        </p>
      )}
    </div>
  );
}
