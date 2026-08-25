import AutoReload from "@/components/AutoReload";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AutoReload />
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </>
  );
}
