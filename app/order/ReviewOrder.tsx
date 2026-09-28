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
    imageUrl: string | null;
  };
  sewingStyle: {
    label: string;
    value: string;
  };
  measurements: Array<{ label: string; value: number }>;
  editMeasurementsHref: string;
};

export default function ReviewOrder({ fabric, design, sewingStyle, measurements, editMeasurementsHref }: Props) {
  return (
    <section style={reviewCardStyle} aria-labelledby="review-heading">
      <div style={{ marginBottom: 20 }}>
        <h2 id="review-heading" style={{ margin: '4px 0 6px', fontSize: 24 }}>Review your order</h2>
        <p style={{ margin: 0, color: '#666' }}>Check your selections before continuing.</p>
      </div>

      <section style={summarySectionStyle} aria-labelledby="fabric-heading">
        <h3 id="fabric-heading" style={sectionHeadingStyle}>Fabric</h3>
        <p style={detailStyle}><strong>{fabric.name}</strong>{fabric.type ? ` · ${fabric.type}` : ''}</p>
        <p style={detailStyle}>WhatsApp reference: <strong>{fabric.reference}</strong></p>
        <p style={{ ...detailStyle, marginBottom: 0 }}>Price: <strong>₦{fabric.price.toLocaleString('en-NG')}</strong></p>
      </section>

      <section style={summarySectionStyle} aria-labelledby="design-heading">
        <h3 id="design-heading" style={sectionHeadingStyle}>Design</h3>
        {design.imageUrl ? (
          <div style={{ position: 'relative', width: '100%', maxWidth: 360, height: 300, overflow: 'hidden', borderRadius: 12, background: '#f0f1f0' }}>
            <Image src={design.imageUrl} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={imageUnavailableStyle}>Design image unavailable</div>
        )}
        <p style={{ ...detailStyle, marginTop: 12 }}>{design.category}</p>
        <p style={detailStyle}><strong>{design.name}</strong></p>
        <p style={{ ...detailStyle, marginBottom: 0 }}>Design reference: <strong>{design.reference}</strong></p>
      </section>

      <section style={summarySectionStyle} aria-labelledby="style-heading">
        <h3 id="style-heading" style={sectionHeadingStyle}>Sewing style</h3>
        <p style={{ ...detailStyle, marginBottom: 0 }}><strong>{sewingStyle.label}</strong> <span style={{ color: '#666' }}>({sewingStyle.value})</span></p>
      </section>

      <section style={summarySectionStyle} aria-labelledby="measurements-heading">
        <h3 id="measurements-heading" style={sectionHeadingStyle}>Measurements</h3>
        <dl style={measurementListStyle}>
          {measurements.map((measurement) => (
            <div key={measurement.label} style={measurementRowStyle}>
              <dt>{measurement.label}</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}>{measurement.value}</dd>
            </div>
          ))}
        </dl>
        <Link href={editMeasurementsHref} style={editButtonStyle}>Edit measurements</Link>
      </section>

      <p style={reviewNoticeStyle}>Your selections are ready for review. No order has been submitted.</p>
    </section>
  );
}

const reviewCardStyle = { padding: 20, border: '1px solid #dfe7e2', borderRadius: 14, background: '#fff', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)' } as const;
const summarySectionStyle = { padding: '16px 0', borderTop: '1px solid #e7ebe8' } as const;
const sectionHeadingStyle = { margin: '0 0 12px', fontSize: 18 } as const;
const detailStyle = { margin: '0 0 7px', color: '#444', lineHeight: 1.5 } as const;
const imageUnavailableStyle = { display: 'grid', width: '100%', maxWidth: 360, height: 240, placeItems: 'center', borderRadius: 12, background: '#f0f1f0', color: '#666' } as const;
const measurementListStyle = { margin: 0, display: 'grid', gap: 0 } as const;
const measurementRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #eef0ef', color: '#444' } as const;
const editButtonStyle = { display: 'inline-block', marginTop: 16, padding: '11px 15px', border: '1px solid #176b4d', borderRadius: 8, color: '#14543e', textDecoration: 'none', fontWeight: 700 } as const;
const reviewNoticeStyle = { margin: '10px 0 0', padding: 13, borderRadius: 9, background: '#f4fbf6', color: '#245b3e', lineHeight: 1.5 } as const;
