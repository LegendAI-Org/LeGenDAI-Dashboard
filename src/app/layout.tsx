import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noga CRM Dashboard",
  description: "Premium CRM Dashboard for Noga",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" data-theme="dark">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
