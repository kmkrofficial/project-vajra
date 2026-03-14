/**
 * Kiosk layout — strips all app chrome (sidebar, topbar, mobile nav).
 * Returns only children, giving the kiosk page full-screen control.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
