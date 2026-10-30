import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { updateShopOrderStatusAction } from './actions';

export default async function ChildShopDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/shop/dashboard');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, full_name')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isChildShop = profile?.role === 'child_shop' && profile?.is_active;

  if (!isAdmin && !isChildShop) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '32px', borderRadius: '16px' }}>
          <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>Access Restricted</h2>
          <p style={{ color: '#7f1d1d', margin: '0 0 16px', fontSize: '0.95rem' }}>
            This workshop floor requires authorization. Your account is not configured as an active Child Shop branch.
          </p>
          <Link
            href="/partner/apply"
            style={{
              display: 'inline-block',
              background: '#0f172a',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            Apply as Branch Partner →
          </Link>
        </div>
      </div>
    );
  }

  // Find target shop:
  let shop: any = null;
  let allShopsForAdmin: any[] = [];

  if (isAdmin) {
    const { data: shops } = await supabase
      .from('child_shops')
      .select('id, name, location, phone, status')
      .order('name');

    allShopsForAdmin = shops || [];

    if (resolvedSearchParams.shopId) {
      shop = allShopsForAdmin.find((s) => s.id === resolvedSearchParams.shopId);
    }
    if (!shop && allShopsForAdmin.length > 0) {
      shop = allShopsForAdmin[0];
    }
  } else {
    const { data: ownedShop } = await supabase
      .from('child_shops')
      .select('id, name, location, phone, status')
      .eq('owner_profile_id', user.id)
      .single();

    shop = ownedShop;
  }

  if (!shop) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fef3c7', border: '1px solid #fde047', padding: '32px', borderRadius: '16px' }}>
          <h2 style={{ color: '#92400e', margin: '0 0 8px' }}>No Workshop Found</h2>
          <p style={{ color: '#78350f', margin: 0, fontSize: '0.95rem' }}>
            {isAdmin
              ? 'No child shops exist yet. Authorize an application at /admin/shops.'
              : 'Your branch application is still being processed.'}
          </p>
        </div>
      </div>
    );
  }

  // Fetch orders routed to this shop
  const { data: assignedOrders = [] } = await supabase
    .from('orders')
    .select(`
      id,
      order_reference,
      customer_name,
      customer_phone,
      status,
      fabric_name_at_order,
      fabric_reference_at_order,
      design_reference_at_order,
      design_name_at_order,
      sewing_style_name_at_order,
      measurements,
      created_at
    `)
    .eq('child_shop_id', shop.id)
    .order('created_at', { ascending: false });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '36px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Admin Switcher Bar (Only visible if Admin is inspecting) */}
        {isAdmin && (
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '10px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.88rem' }}>
              👑 <strong>HQ Admin Mode:</strong> Inspecting workshop floor as an administrator.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Switch Branch:</span>
              <form method="GET" action="/shop/dashboard" style={{ display: 'flex', gap: '6px' }}>
                <select
                  name="shopId"
                  defaultValue={shop.id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: '#1e293b',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                  }}
                >
                  {allShopsForAdmin.map((s) => (
                    <option key={s.id} value={s.id}>
                      🏢 {s.name} ({s.location || 'Branch'})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#6366f1',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  View
                </button>
              </form>

              <Link
                href="/admin/orders"
                style={{
                  color: '#cbd5e1',
                  fontSize: '0.82rem',
                  textDecoration: 'underline',
                  marginLeft: '8px',
                }}
              >
                Back to Orders Queue
              </Link>
            </div>
          </div>
        )}

        {/* Branch Workshop Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px 28px',
            marginBottom: '28px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              BRANCH WORKSHOP FLOOR
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 2px', color: '#0f172a' }}>{shop.name}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              📍 {shop.location || 'Branch Facility'} • 📞 {shop.phone || 'No direct phone'}
            </p>
          </div>

          <div style={{ textAlign: 'right', background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              {assignedOrders.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Jobs</div>
          </div>
        </header>

        {/* Orders Queue on Floor */}
        {assignedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✂️</div>
            <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontWeight: 700 }}>No production jobs on this floor</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Assign orders from the <Link href="/admin/orders" style={{ color: '#6366f1', fontWeight: 700 }}>HQ Orders Queue</Link> to route work here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {assignedOrders.map((job: any) => {
              const isReady = job.status === 'READY';
              const inProd = job.status === 'IN PRODUCTION';

              return (
                <div
                  key={job.id}
                  style={{
                    border: isReady ? '1px solid #86efac' : inProd ? '1px solid #fde047' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '24px',
                    background: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Job Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Job #{job.order_reference}</span>
                      <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: '2px' }}>
                        Client: <strong>{job.customer_name || 'Walk-in'}</strong> ({job.customer_phone || 'No phone'})
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: isReady ? '#dcfce7' : inProd ? '#fef3c7' : '#ede9fe',
                        color: isReady ? '#14532d' : inProd ? '#92400e' : '#5b21b6',
                        border: `1px solid ${isReady ? '#86efac' : inProd ? '#fde047' : '#c4b5fd'}`,
                        letterSpacing: '0.04em',
                      }}
                    >
                      ● {job.status}
                    </span>
                  </div>

                  {/* Garment Specifications */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '14px',
                      background: '#f8fafc',
                      padding: '16px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>FABRIC SPEC</span>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{job.fabric_name_at_order || 'Supplied Fabric'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Ref: {job.fabric_reference_at_order || 'N/A'}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>SEWING STYLE</span>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{job.sewing_style_name_at_order || 'Standard Cut'}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>EMBROIDERY SPEC</span>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{job.design_name_at_order || 'None'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Code: {job.design_reference_at_order || 'Plain'}</div>
                    </div>
                  </div>

                  {/* Cutting Measurements */}
                  {job.measurements && Object.keys(job.measurements).length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '8px', letterSpacing: '0.04em' }}>
                        CUTTING SPECIFICATIONS (INCHES)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(job.measurements).map(([k, v]) => (
                          <span
                            key={k}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.85rem',
                              color: '#0f172a',
                            }}
                          >
                            <strong style={{ color: '#475569' }}>{k.replace(/_/g, ' ')}:</strong> {String(v)}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    {job.status === 'ASSIGNED' && (
                      <form action={updateShopOrderStatusAction}>
                        <input type="hidden" name="orderRef" value={job.order_reference} />
                        <input type="hidden" name="status" value="IN PRODUCTION" />
                        <button
                          type="submit"
                          style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                          }}
                        >
                          ✂️ Begin Cutting & Sewing
                        </button>
                      </form>
                    )}

                    {job.status === 'IN PRODUCTION' && (
                      <form action={updateShopOrderStatusAction}>
                        <input type="hidden" name="orderRef" value={job.order_reference} />
                        <input type="hidden" name="status" value="READY" />
                        <button
                          type="submit"
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          ✓ Finished - Mark Ready for Dispatch
                        </button>
                      </form>
                    )}

                    {isReady && (
                      <div
                        style={{
                          background: '#dcfce7',
                          border: '1px solid #86efac',
                          color: '#14532d',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                        }}
                      >
                        ✓ Tailoring complete. Outfit is ready for customer pickup / HQ dispatch.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}