export default function OrderLoading() {
  return (
    <main style={{ display: 'grid', minHeight: 'calc(100vh - 80px)', placeItems: 'center', padding: 24, background: '#f7f8f7' }}>
      <section aria-live="polite" style={{ width: '100%', maxWidth: 520, padding: 24, border: '1px solid #e3e3e3', borderRadius: 16, background: '#fff', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, margin: '0 auto 14px', border: '3px solid #dce6df', borderTopColor: '#176b4d', borderRadius: '50%', animation: 'order-spin 0.8s linear infinite' }} />
        <p style={{ margin: 0, color: '#555', fontWeight: 600 }}>Loading your fabric and design choices…</p>
        <style>{'@keyframes order-spin { to { transform: rotate(360deg); } }'}</style>
      </section>
    </main>
  );
}
