import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(180deg, #0b1120 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '80px 20px 105px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fbbf24',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              padding: '6px 14px',
              borderRadius: '9999px',
              display: 'inline-block',
              marginBottom: '18px',
            }}
          >
            MKTF BESPOKE TAILORING ATELIER
          </span>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 18px',
              color: '#ffffff',
            }}
          >
            MKTF Precision Tailoring &<br />
            <span style={{ color: '#fbbf24' }}>Live Workshop Tracking</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              color: '#cbd5e1',
              lineHeight: 1.6,
              maxWidth: '640px',
              margin: '0 auto 36px',
            }}
          >
            Custom-fitted Kaftans, ceremonial Babban Riga, and executive native wear. Select your styles, customize neck & sleeve finishes, and track your outfit through every workshop stage.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/order/new"
              style={{
                backgroundColor: '#b45309',
                backgroundImage: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                padding: '16px 34px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(180, 83, 9, 0.45)',
                border: '1px solid #fde68a',
              }}
            >
              Order & Customize Outfit &rarr;
            </Link>

            <Link
              href="/track"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: '1.5px solid #334155',
                padding: '16px 28px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1rem',
                textDecoration: 'none',
              }}
            >
              Track Existing Order
            </Link>
          </div>
        </div>
      </section>

      {/* Gateway Cards */}
      <section style={{ maxWidth: '1100px', margin: '-50px auto 60px', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', marginBottom: '14px' }}>01</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                MKTF Design Catalog
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 20px' }}>
                Explore authentic cuts, zoom into high-definition embroidery artwork, and choose collar, pocket, and sleeve finishes in both English and Hausa.
              </p>
            </div>
            <Link
              href="/order/new"
              style={{
                color: '#b45309',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              Start MKTF Order &rarr;
            </Link>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', marginBottom: '14px' }}>02</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                Live Production Tracking
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 20px' }}>
                Enter your MKTF order reference or phone number to view live workshop stages: Cutting, Embroidery, Sewing, and Pickup clearance with OPay settlement.
              </p>
            </div>
            <Link
              href="/track"
              style={{
                color: '#0284c7',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              Check My Outfit Status &rarr;
            </Link>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: '14px' }}>03</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                Customer Support & Feedback
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 20px' }}>
                Have questions regarding custom fittings, fabric choices, turnaround times, or want to send us feedback? Contact our team anytime.
              </p>
            </div>
            <Link
              href="/contact"
              style={{
                color: '#0f172a',
                fontWeight: 800,
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              Open Support & Feedback &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Global Standard Master Footer */}
      <footer
        style={{
          backgroundColor: '#0b1120',
          color: '#94a3b8',
          borderTop: '1px solid #1e293b',
          padding: '48px 20px 32px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '30px',
            marginBottom: '36px',
          }}
        >
          <div>
            <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', marginBottom: '8px' }}>
              MKTF TAILORING
            </div>
            <p style={{ fontSize: '0.84rem', lineHeight: 1.5, margin: '0 0 12px' }}>
              Custom-measured bespoke native wear, Hausa traditional attire, and live workshop floor management.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
              Settlement: OPay (8030635560)
            </div>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', marginBottom: '10px' }}>
              QUICK NAVIGATION
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
              <Link href="/order/new" style={{ color: '#cbd5e1', textDecoration: 'none' }}>&bull; Book Bespoke Outfit</Link>
              <Link href="/track" style={{ color: '#cbd5e1', textDecoration: 'none' }}>&bull; Live Order Tracking</Link>
              <Link href="/contact" style={{ color: '#cbd5e1', textDecoration: 'none' }}>&bull; Contact & Feedback</Link>
              <Link href="/staff/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>&bull; Staff Workshop Login</Link>
            </div>
          </div>

          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', marginBottom: '10px' }}>
              OFFICIAL CONTACT LINES
            </div>
            <div style={{ fontSize: '0.84rem', lineHeight: 1.6 }}>
              <div>Master Line: <strong style={{ color: '#fbbf24' }}>0803 063 5560</strong></div>
              <div>Support Line: <strong style={{ color: '#38bdf8' }}>0911 640 5923</strong></div>
              <div>Workshop Line: <strong style={{ color: '#a78bfa' }}>0907 096 4922</strong></div>
              <div style={{ marginTop: '6px', color: '#64748b' }}>Turnaround: 3&ndash;5 Working Days</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', textAlign: 'center', fontSize: '0.78rem' }}>
          &copy; {new Date().getFullYear()} MKTF Tailoring Workshop. All rights reserved.
        </div>
      </footer>
    </div>
  );
}