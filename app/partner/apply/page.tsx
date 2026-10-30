import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { submitShopApplicationAction } from './actions';

export default async function PartnerApplyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/partner/apply');
  }

  const { data: existingShop } = await supabase
    .from('child_shops')
    .select('id, status')
    .eq('owner_profile_id', user.id)
    .single();

  if (existingShop) {
    redirect('/partner/status');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '2px solid #cbd5e1',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    outline: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#ede9fe',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              marginBottom: '12px',
            }}
          >
            ✂️
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
            Branch Workshop Application
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Register your facility to receive overflow production, cutting, and sewing orders from Master HQ.
          </p>
        </div>

        <form action={submitShopApplicationAction} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Workshop / Facility Name *
            </label>
            <input
              type="text"
              name="shopName"
              required
              placeholder="e.g. Kano Elite Tailors Hub"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Physical Workshop Address *
            </label>
            <input
              type="text"
              name="location"
              required
              placeholder="e.g. Shop 42, Commercial Avenue, Sabon Gari, Kano"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Direct WhatsApp / Phone Contact *
            </label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="e.g. +234 812 345 6789"
              style={inputStyle}
            />
          </div>

          {/* Workshop Capacity & Equipment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Sewing Machines & Tools *
              </label>
              <input
                type="number"
                name="equipmentCount"
                min="1"
                defaultValue="3"
                required
                placeholder="Number of operational machines"
                style={inputStyle}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Industrial, overlock, and straight machines.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Production Capacity Tier *
              </label>
              <select name="capacityTier" defaultValue="medium" style={inputStyle}>
                <option value="high">🟢 High (15+ garments / week)</option>
                <option value="medium">🟡 Medium (6 - 14 garments / week)</option>
                <option value="low">⚪ Low (1 - 5 garments / week)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Determines how many overflow jobs HQ routes to you.
              </span>
            </div>
          </div>

          {/* Terms & Conditions Box with Deactivation Warning */}
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '16px',
              borderRadius: '10px',
              marginTop: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                type="checkbox"
                name="termsAgreement"
                id="termsAgreement"
                required
                style={{ width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="termsAgreement" style={{ fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5, cursor: 'pointer' }}>
                <strong>Quality & Consistency Agreement:</strong> I agree to strictly match all customer cutting measurements and uphold delivery timelines provided by Master HQ. I understand that repeated production delays, inaccurate stitching, or unexplained inconsistency will result in immediate suspension or permanent deactivation of this workshop branch.
              </label>
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            Submit Workshop Application →
          </button>
        </form>
      </main>
    </div>
  );
}