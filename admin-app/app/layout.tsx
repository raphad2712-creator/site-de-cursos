import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gambeti EaD",
  description: "Cursos e treinamentos em segurança do trabalho.",
  icons: {
    icon: "/gambeti-logo.png",
    shortcut: "/gambeti-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
