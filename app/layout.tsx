import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Editora Jocum",
    template: "%s | Editora Jocum",
  },
  description:
    "Livros que transformam vidas. Conhecer a Deus e fazê-lo conhecido.",
  keywords: ["livros cristãos", "editora jocum", "missões", "literatura cristã"],
  authors: [{ name: "Editora Jocum" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Editora Jocum",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
