export const dynamic = "force-static";

export default function WaEsRedirect() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>WhatsApp Connection</h1>
        <p style={{ color: '#4b5563' }}>Status: OK</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>This window can be closed if it doesn't close automatically.</p>
      </div>
    </main>
  );
}
