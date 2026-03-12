import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
      <SignIn forceRedirectUrl="/dashboard" />
    </div>
  );
}
