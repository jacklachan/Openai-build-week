import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { ThemeToggle } from "../components/theme-toggle";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tessera | Group travel, negotiated",
  description: "An explainable AI group-travel negotiator.",
};

const themeScript = `
const themeStorageKey = "tessera-theme";
const storedTheme = localStorage.getItem(themeStorageKey);
const theme = storedTheme === "light" || storedTheme === "dark"
  ? storedTheme
  : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
document.documentElement.dataset.theme = theme;
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
