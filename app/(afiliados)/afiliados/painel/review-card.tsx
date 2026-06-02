"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { UpdateLeaderDialog } from "./update-leader-dialog";

export function ReviewCard({
  affiliateId, nextReviewAt, reviewDays, reviewUrgent, reviewExpired,
  leaderName, leaderEmail, leaderPhone,
}: {
  affiliateId: string;
  nextReviewAt: string;
  reviewDays: number;
  reviewUrgent: boolean;
  reviewExpired: boolean;
  leaderName: string | null;
  leaderEmail: string | null;
  leaderPhone: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const color = reviewExpired
    ? "border-red-200 bg-red-50"
    : reviewUrgent
    ? "border-orange-200 bg-orange-50"
    : "border-green-200 bg-green-50";

  const Icon = reviewExpired || reviewUrgent ? AlertTriangle : CheckCircle2;
  const iconColor = reviewExpired ? "text-red-500" : reviewUrgent ? "text-orange-500" : "text-green-500";

  const label = reviewExpired
    ? "Avaliação vencida"
    : reviewUrgent
    ? `Renovação em ${reviewDays} dia${reviewDays !== 1 ? "s" : ""}`
    : `Próxima avaliação em ${reviewDays} dia${reviewDays !== 1 ? "s" : ""}`;

  const sub = reviewExpired
    ? "Sua avaliação de vínculo JOCUM venceu. Nossa equipe entrará em contato."
    : reviewUrgent
    ? "Verifique os dados do seu líder — nossa equipe enviará um e-mail de confirmação em breve."
    : `${new Date(nextReviewAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`;

  return (
    <>
      <UpdateLeaderDialog
        affiliateId={affiliateId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultName={leaderName}
        defaultEmail={leaderEmail}
        defaultPhone={leaderPhone}
      />
      <Card className={`border ${color}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${reviewExpired ? "bg-red-100" : reviewUrgent ? "bg-orange-100" : "bg-green-100"} shrink-0`}>
              {reviewUrgent || reviewExpired ? (
                <Icon className={`h-5 w-5 ${iconColor}`} />
              ) : (
                <CalendarClock className={`h-5 w-5 ${iconColor}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${reviewExpired ? "text-red-700" : reviewUrgent ? "text-orange-700" : "text-green-700"}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
            {(reviewUrgent || reviewExpired) && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs"
                onClick={() => setDialogOpen(true)}
              >
                Atualizar líder
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
