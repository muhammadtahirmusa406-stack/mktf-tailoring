import { createClient } from '@/lib/supabase/server';

type Props = {
  searchParams: Promise<{ fabric?: string | string[] }>;
};

function MessageCard({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <section
      style={{
        width: '100%',
        maxWidth: 520,
        padding: 24,
        border: '1px solid #e3e3e3',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 8px 28px rgba(0, 0, 0, 0.05)',
      }}
    >
      <p
        style={{
          margin: 0,
          color: tone === 'error' ? '#a32121' : '#666',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        WhatsApp fabric selection
      </p>
      <h1 style={{ margin: '12px 0', fontSize: 26, lineHeight: 1.2 }}>{title}</h1>
      <div style={{ color: '#555', lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

export default async function OrderEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  const referenceCode = typeof params.fabric === 'string' ? params.fabric.trim() : '';

  if (!referenceCode) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Choose a fabric from WhatsApp">
          <p style={{ marginBottom: 0 }}>Open the Order in App link shared with your fabric picture to continue with that selection.</p>
        </MessageCard>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: option, error: optionError } = await supabase
    .from('fabric_options')
    .select('fabric_product_id, reference_code, is_active')
    .eq('reference_code', referenceCode)
    .maybeSingle();

  if (optionError) {
    return (
      <main style={pageStyle}>
        <MessageCard title="We couldn’t load this fabric" tone="error">
          <p style={{ marginBottom: 0 }}>Please try opening the WhatsApp link again in a moment.</p>
        </MessageCard>
      </main>
    );
  }

  if (!option) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric reference not found" tone="error">
          <p style={{ marginBottom: 0 }}>That fabric reference could not be found.</p>
        </MessageCard>
      </main>
    );
  }

  if (!option.is_active) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric no longer available" tone="error">
          <p style={{ marginBottom: 0 }}>This fabric is no longer available.</p>
        </MessageCard>
      </main>
    );
  }

  const { data: product, error: productError } = await supabase
    .from('fabric_products')
    .select('name, type, price')
    .eq('id', option.fabric_product_id)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) {
    return (
      <main style={pageStyle}>
        <MessageCard title="We couldn’t load this fabric" tone="error">
          <p style={{ marginBottom: 0 }}>Please try opening the WhatsApp link again in a moment.</p>
        </MessageCard>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric no longer available" tone="error">
          <p style={{ marginBottom: 0 }}>This fabric is no longer available.</p>
        </MessageCard>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section
        style={{
          width: '100%',
          maxWidth: 520,
          overflow: 'hidden',
          border: '1px solid #e3e3e3',
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ padding: 24 }}>
          <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Selected from WhatsApp
          </p>
          <h1 style={{ margin: '12px 0 8px', fontSize: 28, lineHeight: 1.2 }}>{product.name}</h1>
          {product.type && <p style={{ margin: '0 0 20px', color: '#666' }}>{product.type}</p>}

          <div style={{ padding: 16, borderRadius: 12, background: '#f6f8f7' }}>
            <p style={{ margin: 0, color: '#666', fontSize: 13 }}>WhatsApp picture reference</p>
            <p style={{ margin: '5px 0 0', fontSize: 19, fontWeight: 700, letterSpacing: '0.03em', overflowWrap: 'anywhere' }}>{option.reference_code}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, marginTop: 22 }}>
            <span style={{ color: '#666' }}>Product price</span>
            <strong style={{ fontSize: 24 }}>₦{Number(product.price).toLocaleString('en-NG')}</strong>
          </div>

          <button type="button" disabled style={{ width: '100%', marginTop: 24, padding: 14, border: 0, borderRadius: 9, background: '#b8b8b8', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'not-allowed' }}>
            Continue
          </button>
          <p style={{ margin: '10px 0 0', color: '#777', fontSize: 13, textAlign: 'center' }}>Order setup is coming next. Your fabric selection is confirmed on this page.</p>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  display: 'flex',
  minHeight: 'calc(100vh - 80px)',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  background: '#f7f8f7',
} as const;
