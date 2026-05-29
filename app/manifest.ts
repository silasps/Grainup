import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Editora Jocum",
    short_name: "Editora Jocum",
    description: "Livros que transformam vidas. Conhecer a Deus e fazê-lo conhecido.",
    start_url: "/editora",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a7c3e",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
