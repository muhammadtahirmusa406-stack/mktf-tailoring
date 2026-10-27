import Image from 'next/image';
import Link from 'next/link';

type Props = {
  fabric: {
    name: string;
    type: string | null;
    price: number;
    reference: string;
  };
  design: {
    category: string;
    name: string;
    reference: string;
    price: number;
    imageUrl: string | null;
  };
  sewingStyle: {
    label: string;
    value: string;
    charge: number;
  };
  measurements: Array<{ label: string; value: number }>;
  editMeasurementsHref: string;
};

export default function ReviewOrder({
  fabric,
  design,
  sewingStyle,
  measurements,
  editMeasurementsHref,
}: Props) {
  const totalPrice = fabric.price + design.price + sewingStyle.charge;

  return (
    <section style={reviewCardStyle} aria-labelledby="review-heading">
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Step 5 of 5
        </p>
        <h2 id="review-heading" style={{ margin: '6px 0 6px', fontSize: 26 }}>Review your order</h2>
        <p style={{ margin: 0, color: '#666' }}>Verify your selections and measurements before submitting.</p>
      </div>


      <section style={summarySectionStyle} aria-labelledby="fabric-heading">
        <h3 id="fabric-heading" style={sectionHeadingStyle}>Fabric</h3>
        <p style={detailStyle}><strong>{fabric.name}</strong>{fabric.type ? ' - ' + fabric.type : ''}</p>
        <p style={detailStyle}>Fabric reference: <strong>{fabric.reference}</strong></p>
        <p style={{ ...detailStyle, marginBottom: 0 }}>Fabric Price: <strong>\u20A6{fabric.price.toLocaleString()}</strong></p>
      </section>


      <section style={summarySectionStyle} aria-labelledby="design-heading">
        <h3 id="design-heading" style={sectionHeadingStyle}>Design & Picture</h3>
        {design.imageUrl ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 300, overflow: 'hidden', borderRadius: 12, background: '#f0f1f0', marginBottom: 12 }}>
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


      <section style={summarySectionStyle} aria-labelledby="pricing-heading">
        <h3 id="pricing-heading" style={sectionHeadingStyle}>Price Breakdown</h3>
        <div style={{ background: '#f8f9f8', padding: 16, borderRadius: 10, display: 'grid', gap: 8 }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ddd', paddingTop: 8, marginTop: 4, fontWeight: 800, fontSize: 18, color: '#176b4d' }}>
            <span>Total Authoritative Price:</span>
            <span>\u20A6{totalPrice.toLocaleString()}</span>
          </div>
        </div>
      </section>


      <section style={summarySectionStyle} aria-labelledby="measurements-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 id="measurements-heading" style={{ ...sectionHeadingStyle, margin: 0 }}>Measurements ({measurements.length})</h3>
          <Link style={editButtonStyle} href={editMeasurementsHref}>Edit</Link>
        </div>
        <dl style={measurementListStyle}>
          {measurements.map((measurement) => (
            <div key={measurement.label} style={measurementRowStyle}>
              <dt>{measurement.label}</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}>{measurement.value}</dd>
            </div>
          ))}
        </dl>
      </section>


      <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: '#f4fbf6', border: '1px solid #cde5d6' }}>
        <p style={{ margin: '0 0 12px', color: '#245b3e', fontWeight: 600 }}>
          Your order details are ready. Next step: Confirm Order transaction.
        </p>
        <button
          type="button"
          disabled
          style={{ width: '100%', padding: 15, border: 0, borderRadius: 10, background: '#176b4d', color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'not-allowed', opacity: 0.8 }}>
          Confirm & Submit Order (Next Milestone)
        </button>
      </div>
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
