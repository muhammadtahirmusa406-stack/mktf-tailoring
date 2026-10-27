'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { submitOrderAction, type SubmitOrderState } from './actions';
type Props = { fabric: { name: string; type: string | null; price: number; reference: string; }; design: { category: string; name: string; reference: string; price: number; imageUrl: string | null; }; sewingStyle: { id: string; label: string; value: string; charge: number; }; measurements: Array<{ label: string; value: number }>; measurementsJson: string; editMeasurementsHref: string; };
const initialState: SubmitOrderState = {};
export default function ReviewOrder({ fabric, design, sewingStyle, measurements, measurementsJson, editMeasurementsHref }: Props) {
  const [state, formAction, isPending] = useActionState(submitOrderAction, initialState);
  const totalPrice = fabric.price + design.price + sewingStyle.charge;
  return (
    <section style={reviewCardStyle} aria-labelledby="review-heading">
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step 5 of 5</p>
        <h2 id="review-heading" style={{ margin: '6px 0 6px', fontSize: 26 }}>Review your order</h2>
        <p style={{ margin: 0, color: '#666' }}>Verify your order details, provide your contact details, and submit.</p>
      </div>
      {state?.error && (
        <div role="alert" style={errorAlertStyle}>
          {state.error}
        </div>
      )}
      <section style={summarySectionStyle} aria-labelledby="fabric-heading">
        <h3 id="fabric-heading" style={sectionHeadingStyle}>Fabric</h3>
        <p style={detailStyle}><strong>{fabric.name}</strong>{fabric.type ? ' - ' + fabric.type : ''}</p>
        <p style={detailStyle}>Fabric reference: <strong>{fabric.reference}</strong></p>
        <p style={{ ...detailStyle, marginBottom: 0 }}>Fabric Price: <strong>\u20A6{fabric.price.toLocaleString()}</strong></p>
      </section>
      <section style={summarySectionStyle} aria-labelledby="design-heading">
        <h3 id="design-heading" style={sectionHeadingStyle}>Design & Picture</h3>
        {design.imageUrl ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 280, overflow: 'hidden', borderRadius: 12, background: '#f0f1f0', marginBottom: 12 }}>
            <Image src={design.imageUrl} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={imageUnavailableStyle}>Design image unavailable</div>
        )}
        <p style={detailStyle}>Category: <strong>{design.category}</strong></p>
      <p style={detailStyle}>Design Reference: <strong>{design.reference}</strong></p>
      <p style={{ ...detailStyle, marginBottom: 0 }}>Design Group Price: <strong>\u20A6{design.price.toLocaleString()}</strong></p>
      </section>
      <section style={summarySectionStyle} aria-labelledby="style-heading">
        <h3 id="style-heading" style={sectionHeadingStyle}>Sewing Style</h3>
        <p style={detailStyle}>Style: <strong>{sewingStyle.label}</strong></p>
        <p style={{ ...detailStyle, marginBottom: 0 }}>Sewing Charge: <strong>\u20A6{sewingStyle.charge.toLocaleString()}</strong></p>
      </section>
      <section style={summarySectionStyle} aria-labelledby="measurements-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 id="measurements-heading" style={{ ...sectionHeadingStyle, margin: 0 }}>Measurements ({measurements.length})</h3>
          <Link style={editButtonStyle} href={editMeasurementsHref}>Edit</Link>
        </div>
        <dl style={measurementListStyle}>
          {measurements.map((m) => (
            <div key={m.label} style={measurementRowStyle}>
              <dt>{m.label}</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}>{m.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section style={summarySectionStyle} aria-labelledby="pricing-heading">
        <h3 id="pricing-heading" style={sectionHeadingStyle}>Price Breakdown</h3>
        <div style={{ background: '#f8f9f8', padding: 16, borderRadius: 12, display: 'grid', gap: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>Fabric:</span>
            <span>\u20A6{fabric.price.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>Design:</span>
            <span>\u20A6{design.price.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
            <span>Sewing charge:</span>
            <span>\u20A6{sewingStyle.charge.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ddd', paddingTop: 10, marginTop: 4, fontWeight: 800, fontSize: 19, color: '#176b4d' }}>
            <span>Total Authoritative Price:</span>
            <span>\u20A6{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </section>
      <form action={formAction} style={{ marginTop: 24, padding: 20, borderRadius: 14, background: '#f4fbf6', border: '1px solid #cde5d6' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 18, color: '#176b4d' }}>Contact Details for this Order</h3>
        <input type="hidden" name="fabricReference" value={fabric.reference} />
        <input type="hidden" name="designReference" value={design.reference} />
        <input type="hidden" name="sewingStyleId" value={sewingStyle.id} />
        <input type="hidden" name="measurementsJson" value={measurementsJson} />
        <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
          <div>
            <label htmlFor="customerName" style={labelStyle}>Your Full Name</label>
            <input id="customerName" name="customerName" type="text" required autoComplete="name" placeholder="e.g. 08012345678 or Ibrahim Aliyu" style={inputStyle} />
            {state?.fieldErrors?.name && <p style={fieldErrorStyle}>{state.fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="customerPhone" style={labelStyle}>Phone Number (WhatsApp)</label>
            <input id="customerPhone" name="customerPhone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="e.g. 08012345678" style={inputStyle} />
            {state?.fieldErrors?.phone && <p style={fieldErrorStyle}>{state.fieldErrors.phone}</p>}
          </div>
        </div>
        <button type="submit" disabled={isPending} style={{ ...confirmButtonStyle, ...(isPending ? pendingButtonStyle : {}) }}>
          {isPending ? 'Placing Order...' : 'Confirm & Place Order \u2192'}
        </button>
        <p style={{ margin: '10px 0 0', color: '#666', fontSize: 12, textAlign: 'center' }}>
          By placing your order, an authoritative order record and reference number will be generated.
        </p>
      </form>
    </section>
  );
}
const reviewCardStyle = { padding: 24, border: '1px solid #dfe7e2', borderRadius: 16, background: '#fff', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)' } as const;
const summarySectionStyle = { padding: '18px 0', borderTop: '1px solid #e7ebe8' } as const;
const sectionHeadingStyle = { margin: '0 0 10px', fontSize: 18 } as const;
const detailStyle = { margin: '0 0 6px', color: '#444', lineHeight: 1.5 } as const;
const imageUnavailableStyle = { display: 'grid', width: '100%', maxWidth: 360, height: 240, placeItems: 'center', borderRadius: 12, background: '#f0f1f0', color: '#666' } as const;
const measurementListStyle = { margin: 0, display: 'grid', gap: 0 } as const;
const measurementRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #eef0ef', color: '#444' } as const;
const editButtonStyle = { padding: '6px 12px', border: '1px solid #176b4d', borderRadius: 6, color: '#14543e', textDecoration: 'none', fontWeight: 700, fontSize: 13 } as const;
const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 14, color: '#333' } as const;
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #ccc', borderRadius: 8, fontSize: 15, background: '#fff' } as const;
const confirmButtonStyle = { width: '100%', padding: '15px', border: 0, borderRadius: 10, background: '#176b4d', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer' } as const;
const pendingButtonStyle = { background: '#6ea692', cursor: 'wait' } as const;
const errorAlertStyle = { padding: 14, marginBottom: 16, border: '1px solid #efc8c8', borderRadius: 10, background: '#fff4f4', color: '#a32121', fontSize: 14 } as const;
const fieldErrorStyle = { margin: '4px 0 0', color: '#a32121', fontSize: 12 } as const;
