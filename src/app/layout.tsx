import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Dominia \u2013 Surveillance de domaines & SSL",
    template: "%s | Dominia",
  },
  description:
    "Surveillez vos domaines et certificats SSL en temps r\u00e9el. Alertes automatiques avant expiration.",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Dominia",
    description: "Surveillance de domaines & certificats SSL",
    siteName: "Dominia",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dominia \u2013 Surveillance de domaines & SSL",
    description:
      "Surveillez vos domaines et certificats SSL en temps r\u00e9el. Alertes automatiques avant expiration.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-brand-base text-slate-200`}
      >
        {children}
      </body>
    </html>
  );
}
