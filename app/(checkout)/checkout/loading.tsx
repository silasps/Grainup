import { Loader2 } from "lucide-react";

export default function CheckoutLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white gap-5 text-center px-6">
      <p className="text-2xl font-bold text-foreground leading-snug">
        Preparando tudo para<br />sua compra
      </p>
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
}
