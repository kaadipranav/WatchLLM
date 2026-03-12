import { Sidebar } from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "32px",
          overflowY: "auto",
          maxHeight: "100vh",
        }}
      >
        <div className="page-fade">
          {children}
        </div>
      </main>
    </div>
  );
}
