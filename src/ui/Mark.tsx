/** Tarun's Skylark Exim logo (leaping fish, shrimp, container ships, name), cut out of its white background. */
export function Mark({ className, size = 44 }: { className?: string; size?: number }) {
  return <img className={className} src="/logo-96.png" srcSet="/logo-96.png 1x, /logo-192.png 2x" width={size} height={size} alt="" decoding="async" />
}
