import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noga CRM Dashboard",
  description: "Premium CRM Dashboard for Noga",
  // iOS "add to home screen": full-screen standalone mode + home-screen icon.
  // (iOS reads these meta tags; Android reads the same intent from manifest.ts.)
  appleWebApp: {
    capable: true,
    title: "Noga CRM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
