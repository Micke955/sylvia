export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="app-shell">{children}</div>;
}
