import { Sidebar } from "./Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#000000" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: "32px",
          overflowY: "auto",
          maxHeight: "100vh",
        }}
      >
        {children}
      </main>
    </div>
  );
}
