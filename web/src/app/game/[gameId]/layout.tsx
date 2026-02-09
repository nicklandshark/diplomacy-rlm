export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  return <>{children}</>;
}
