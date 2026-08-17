// Erro tipado com o status HTTP do Bling — em arquivo próprio pra evitar import circular
// entre client.ts (usa getAccessToken de auth.ts) e auth.ts (também precisa lançar BlingError).
export class BlingError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BlingError";
  }
}
