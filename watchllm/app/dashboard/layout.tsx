import { Sidebar } from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, rgba(247,59,0,0.06), transparent 40%), #050506",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "32px 40px",
          overflowY: "auto",
          maxHeight: "100vh",
          background: "transparent",
        }}
      >
        <div className="page-fade">
          {children}
        </div>
      </main>
    </div>
  );
}
