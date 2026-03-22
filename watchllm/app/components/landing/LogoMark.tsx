export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2L3 6v6c0 5.25 3.75 9.75 9 10 5.25-.25 9-4.75 9-10V6l-9-4z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <ellipse
        cx="12"
        cy="11"
        rx="3.2"
        ry="2.4"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="12" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}
