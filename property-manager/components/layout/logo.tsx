export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1c1917" />
      <path d="M8 16.5 16 9l8 7.5V24a1 1 0 0 1-1 1h-4.5v-5h-5v5H9a1 1 0 0 1-1-1z" fill="#fafaf9" />
      <circle cx="23.5" cy="9.5" r="3" fill="#2dd4bf" />
    </svg>
  );
}
