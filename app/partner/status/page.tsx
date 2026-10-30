import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PartnerStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/partner/status');
  }

  const { data: shop } = await supabase
    .from('child_shops')
    .select('id, name, location, phone, status, created_at')
    .eq('owner_profile_id', user.id)
    .single();

  if (!shop) {
    redirect('/partner/apply');
  }

  if (shop.status === 'active') {
    redirect('/shop/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <main style={{ width: '100%', maxWidth: '540px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#fef3c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '16px' }}>
          ⏳
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
          Application Pending Review
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: '0 0 24px', lineHeight: 1.5 }}>
          Your workshop details for <strong style={{ color: '#0f172a' }}>{shop.name}</strong> have been submitted to Master Admin HQ.
        </p>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', textAlign: 'left', fontSize: '0.88rem', color: '#334155', marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}><strong>Branch Name:</strong> {shop.name}</div>
          <div style={{ marginBottom: '8px' }}><strong>Physical Location:</strong> {shop.location}</div>
          <div style={{ marginBottom: '8px' }}><strong>Phone Contact:</strong> {shop.phone}</div>
          <div>
            <strong>Status:</strong>{' '}
            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde047', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>
              ● PENDING HQ APPROVAL
            </span>
          </div>
        </div>

        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          Return to Home
        </Link>
      </main>
    </div>
  );
}
