import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        /* Cyber-Plasma Liquid Void: transparent to show liquid bg */
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SignUp forceRedirectUrl="/dashboard" />
    </div>
  );
}
