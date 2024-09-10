export function HomePage() {
  useAuth();
  useWebsocket();
  return (
    <Layout>
      <div className="flex flex-col flex-1"></div>
    </Layout>
  );
}
