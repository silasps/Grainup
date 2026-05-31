export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col min-h-0">
        {children}
      </main>
    </div>
  );
}
