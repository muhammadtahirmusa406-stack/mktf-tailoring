import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  approveShopApplicationAction,
  rejectShopApplicationAction,
  toggleShopStatusAction,
} from './actions';

export default async function AdminShopsPage() {
  const supabase = await createClient();

  const { data: allShops = [] } = await supabase
    .from('child_shops')
    .select(`
      id,
      name,
      phone,
      location,
      status,
      equipment_count,
      capacity_tier,
      agreed_to_terms,
      terms_agreed_at,
      owner_profile_id,
      created_at,
      profiles:owner_profile_id (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  const pendingApplications = allShops.filter((s: any) => s.status === 'pending');
  const activeAndInactiveShops = allShops.filter((s: any) => s.status !== 'pending');

  const getCapacityBadge = (tier: string) => {
    switch ((tier || '').toLowerCase()) {
      case 'high':
        return { label: 'HIGH CAPACITY (15+/wk)', bg: '#dcfce7', text: '#14532d', border: '#86efac' };
      case 'medium':
        return { label: 'MEDIUM CAPACITY (6-14/wk)', bg: '#fef3c7', text: '#92400e', border: '#fde047' };
      case 'low':
      default:
        return { label: 'LOW CAPACITY (1-5/wk)', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HQ ADMIN PANEL
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', color: '#0f172a' }}>
              Child Shops & Applications
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Review capacity, equipment inventory, and enforce quality standards across partner workshops.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/partner/apply"
              target="_blank"
              style={{
                background: '#6366f1',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              ↗ Public Partner Form
            </Link>
            <Link
              href="/admin/orders"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                padding: '10px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
              }}
            >
              ← Orders Queue
            </Link>
          </div>
        </div>

        {/* SECTION 1: Pending Applications */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏳</span> Incoming Branch Applications ({pendingApplications.length})
          </h2>

          {pendingApplications.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', padding: '28px', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>
              No pending partner requests right now. Prospective tailors can apply at <strong>/partner/apply</strong>.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingApplications.map((app: any) => {
                const owner = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
                const cap = getCapacityBadge(app.capacity_tier);

                return (
                  <div
                    key={app.id}
                    style={{
                      background: '#ffffff',
                      border: '2px solid #fde047',
                      borderRadius: '12px',
                      padding: '22px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{app.name}</strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: cap.bg,
                            color: cap.text,
                            border: `1px solid ${cap.border}`,
                          }}
                        >
                          ● {cap.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          ⚙️ {app.equipment_count || 1} Machine(s)
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '6px' }}>
                        📍 <strong>Location:</strong> {app.location} • 📞 <strong>Phone:</strong> {app.phone}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                        Applicant: <strong>{owner?.full_name || 'Partner'}</strong> ({owner?.email})
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                        ✓ Accepted Quality & Deactivation Policy on {app.terms_agreed_at ? new Date(app.terms_agreed_at).toLocaleDateString() : 'Submission'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <form action={approveShopApplicationAction}>
                        <input type="hidden" name="shopId" value={app.id} />
                        <input type="hidden" name="ownerProfileId" value={app.owner_profile_id} />
                        <button
                          type="submit"
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          ✓ Approve & Authorize
                        </button>
                      </form>

                      <form action={rejectShopApplicationAction}>
                        <input type="hidden" name="shopId" value={app.id} />
                        <button
                          type="submit"
                          style={{
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Decline
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: Authorized Branch Network */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏢</span> Authorized Branch Network ({activeAndInactiveShops.length})
          </h2>

          {activeAndInactiveShops.length === 0 ? (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '36px', textAlign: 'center', color: '#64748b' }}>
              No approved workshops yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeAndInactiveShops.map((s: any) => {
                const owner = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
                const isActive = s.status === 'active';
                const cap = getCapacityBadge(s.capacity_tier);

                return (
                  <div
                    key={s.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{s.name}</strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: cap.bg,
                            color: cap.text,
                            border: `1px solid ${cap.border}`,
                          }}
                        >
                          ● {cap.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          ⚙️ {s.equipment_count || 1} Machine(s)
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#14532d' : '#7f1d1d',
                            border: `1px solid ${isActive ? '#86efac' : '#fca5a5'}`,
                            letterSpacing: '0.04em',
                          }}
                        >
                          ● {s.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '6px' }}>
                        📍 {s.location || 'No location set'} • 📞 {s.phone || 'No phone'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                        Master Tailor: <strong>{owner?.full_name || 'N/A'}</strong> ({owner?.email})
                      </div>
                    </div>

                    <form action={toggleShopStatusAction}>
                      <input type="hidden" name="shopId" value={s.id} />
                      <input type="hidden" name="currentStatus" value={s.status} />
                      <button
                        type="submit"
                        style={{
                          background: isActive ? '#ffffff' : '#16a34a',
                          color: isActive ? '#dc2626' : '#ffffff',
                          border: isActive ? '1px solid #fca5a5' : 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isActive ? 'Deactivate Branch' : 'Reactivate Branch'}
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}