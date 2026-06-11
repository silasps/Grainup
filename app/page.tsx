export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-16 h-16 text-primary opacity-80"
        >
          <path d="M12 6V2" />
          <path d="m4.93 10.93 1.41 1.41" />
          <path d="M2 18h2" />
          <path d="M20 18h2" />
          <path d="m19.07 10.93-1.41 1.41" />
          <path d="M22 22H2" />
          <path d="m8 6 4-4 4 4" />
          <path d="M16 18a4 4 0 0 0-8 0" />
        </svg>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-manrope">
            Editora Jocum
          </h1>
          <p className="text-muted-foreground text-lg">
            Site em configuração
          </p>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Estamos preparando tudo para você. A loja estará disponível em breve
          — volte em algumas horas!
        </p>

        <p className="text-xs text-muted-foreground/60">
          editorajocum.com.br
        </p>
      </div>
    </main>
  );
}
