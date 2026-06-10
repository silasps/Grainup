/**
 * Trata erros retornados por server actions.
 * Se a sessão expirou, redireciona para login imediatamente.
 * Caso contrário, exibe o toast de erro normalmente.
 */
import { toast } from "sonner";

export function handleActionError(error: string | null | undefined) {
  if (!error) return;
  if (error === "SESSION_EXPIRED") {
    window.location.href = `/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
    return;
  }
  toast.error(error);
}
