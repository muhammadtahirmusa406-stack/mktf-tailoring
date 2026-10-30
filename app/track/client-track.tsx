'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function TrackOrderPageClient({ order, rawQuery, searched }: any) {
  const [copied, setCopied] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && order?.order_reference) {
      setTrackingUrl(`${window.location.origin}/track?query=${order.order_reference}`);
    }
  }, [order?.order_reference]);

  const steps = [
    { key: 'CONFIRMED', label: 'Order Confirmed', icon: '📝' },
    { key: 'IN PRODUCTION', label: 'Cutting & Sewing', icon: '✂️' },
    { key: 'READY', label: 'Ready for Pickup', icon: '✨' },
    { key: 'DELIVERED', label: 'Delivered', icon: '📦' },
  ];

  const getStepIndex = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'NEW':
      case 'CONFIRMED':
      case 'ASSIGNED':
        return 0;
      case 'IN PRODUCTION':
        return 1;
      case 'READY':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : -1;

  // Financial calculations
  const totalPrice = Number(order?.total_price) || 60000;
  const isUpfrontFull = order?.payment_choice === '100_PERCENT_FULL' || order?.payment_status === '100%_FULLY_PAID';
  const amountPaid = isUpfrontFull ? totalPrice : (Number(order?.amount_paid) || (totalPrice * 0.5));
  const balanceRemaining = Math.max(0, totalPrice - amountPaid);
  const paymentPercentage = Math.min(100, Math.round((amountPaid / totalPrice) * 100));
  const isFullyPaid = balanceRemaining <= 0 || order?.payment_status === '100%_FULLY_PAID';

  // Master HQ Verified Bank Details
  const bankDetails = {
    bankName: 'OPay',
    accountNumber: '8030635560',
    accountName: 'Abdulrahman Aliyu',
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const p2pWhatsAppMessage = encodeURIComponent(
    `*PAYMENT RECEIPT SUBMISSION*\n` +
    `--------------------------------\n` +
    `*Order Ref:* #${order?.order_reference}\n` +
    `*Client:* ${order?.customer_name}\n` +
    `*Payment Type:* ${balanceRemaining > 0 ? 'Remaining 50% Balance' : '100% Full Payment'}\n` +
    `*Amount:* ₦${balanceRemaining.toLocaleString()}\n` +
    `*Paid To:* OPay (${bankDetails.accountNumber} - ${bankDetails.accountName})\n` +
    `--------------------------------\n` +
    `Hello Master HQ, I have completed the final transfer above. Attached is my bank debit alert receipt:`
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            Track Your Outfit & Payments
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Track cutting progress, manage 50/50 balance settlement, or print full receipts.
          </p>
        </div>

        {/* Search Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            marginBottom: '28px',
          }}
        >
          <form method="GET" action="/track" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              name="query"
              defaultValue={rawQuery}
              required
              placeholder="Enter Order Reference (e.g. ORD-7B35CDB2) or Phone"
              style={{
                flex: '1 1 280px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Track Progress →
            </button>
          </form>
        </div>

        {/* Not Found State */}
        {searched && !order && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #fee2e2',
              borderRadius: '16px',
              padding: '36px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
            <h3 style={{ margin: '0 0 6px', color: '#991b1b', fontWeight: 800 }}>No Order Found</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              We could not find an order matching "<strong>{rawQuery}</strong>". Please verify your order number or phone contact.
            </p>
          </div>
        )}

        {/* Found Order Card */}
        {order && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Order Reference Top Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '20px',
                marginBottom: '28px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTIVE TAILORING JOB
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: '#0f172a' }}>
                  #{order.order_reference}
                </h2>
                <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '2px' }}>
                  Customer: <strong style={{ color: '#0f172a' }}>{order.customer_name}</strong>
                </div>
              </div>

              {/* Scannable Order QR Code */}
              {trackingUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <QRCodeSVG value={trackingUrl} size={84} level="M" />
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700, color: '#64748b', marginTop: '6px', letterSpacing: '0.04em' }}>SCAN TO TRACK</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    letterSpacing: '0.04em',
                    background:
                      order.status === 'READY'
                        ? '#dcfce7'
                        : order.status === 'IN PRODUCTION'
                        ? '#fef3c7'
                        : '#f1f5f9',
                    color:
                      order.status === 'READY'
                        ? '#14532d'
                        : order.status === 'IN PRODUCTION'
                        ? '#92400e'
                        : '#334155',
                    border: `1px solid ${
                      order.status === 'READY'
                        ? '#86efac'
                        : order.status === 'IN PRODUCTION'
                        ? '#fde047'
                        : '#cbd5e1'
                    }`,
                  }}
                >
                  ● {order.status}
                </span>
              </div>
            </div>

            {/* Stepper Progress */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                {steps.map((st, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          background: isDone ? '#16a34a' : '#f1f5f9',
                          color: isDone ? '#ffffff' : '#94a3b8',
                          border: isCurrent ? '3px solid #bbf7d0' : 'none',
                          boxShadow: isCurrent ? '0 0 0 2px #16a34a' : 'none',
                          marginBottom: '8px',
                        }}
                      >
                        {isDone && idx < currentStep ? '✓' : st.icon}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: isCurrent ? 800 : 600,
                          color: isCurrent ? '#0f172a' : isDone ? '#16a34a' : '#94a3b8',
                        }}
                      >
                        {st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  height: '4px',
                  background: '#e2e8f0',
                  borderRadius: '2px',
                  marginTop: '16px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#16a34a',
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* PAYMENT & FINANCIAL LEDGER SECTION */}
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '14px',
                padding: '24px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                    💳 PAYMENT SUMMARY
                  </span>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Plan: <strong>{isUpfrontFull ? '100% Upfront Settlement' : '50% Initial Deposit + 50% Balance on Delivery'}</strong>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: isFullyPaid ? '#dcfce7' : '#fef3c7',
                    color: isFullyPaid ? '#14532d' : '#92400e',
                    border: `1px solid ${isFullyPaid ? '#86efac' : '#fde047'}`,
                  }}
                >
                  ● {paymentPercentage}% SETTLED
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '18px' }}>
                <div
                  style={{
                    width: `${paymentPercentage}%`,
                    height: '100%',
                    background: isFullyPaid ? '#16a34a' : '#f59e0b',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', textAlign: 'center' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL CHARGES</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    ₦{totalPrice.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>PAID TO DATE</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                    ₦{amountPaid.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: balanceRemaining > 0 ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
                    BALANCE DUE
                  </div>
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: balanceRemaining > 0 ? '#dc2626' : '#64748b',
                      marginTop: '4px',
                    }}
                  >
                    ₦{balanceRemaining.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* CASE 1: 50% PAID, OUTSTANDING BALANCE DUE */}
              {balanceRemaining > 0 ? (
                <div
                  style={{
                    marginTop: '20px',
                    background: '#f8fafc',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.3rem' }}>🏦</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                        Complete Remaining 50% Balance
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ede9fe', color: '#6366f1', padding: '2px 8px', borderRadius: '4px' }}>
                      FINAL SETTLEMENT
                    </span>
                  </div>

                  <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    Your initial 50% deposit was verified. To clear this outfit for delivery or collection, please transfer the remaining balance of <strong style={{ color: '#0f172a' }}>₦{balanceRemaining.toLocaleString()}</strong>:
                  </p>

                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        {bankDetails.bankName} Account
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em', margin: '2px 0' }}>
                        {bankDetails.accountNumber}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                        {bankDetails.accountName}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      style={{
                        background: copied ? '#16a34a' : '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {copied ? '✓ Copied to Clipboard!' : '📋 Copy Number'}
                    </button>
                  </div>

                  <a
                    href={`https://wa.me/2348030635560?text=${p2pWhatsAppMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: '#16a34a',
                      color: '#ffffff',
                      padding: '14px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      marginTop: '16px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    <span>📤</span> Send Final Transfer Receipt via WhatsApp
                  </a>
                </div>
              ) : (
                /* CASE 2: 100% PAID UPFRONT OR SETTLED */
                <div
                  style={{
                    marginTop: '18px',
                    background: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '10px',
                    padding: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ color: '#14532d', fontWeight: 800, fontSize: '0.95rem' }}>
                      ✓ 100% Fully Settled Receipt Issued
                    </div>
                    <div style={{ color: '#15803d', fontSize: '0.82rem', marginTop: '2px' }}>
                      Payment fully verified. Order is completely cleared for dispatch and release.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    🖨️ Print Digital Receipt
                  </button>
                </div>
              )}
            </div>

            {/* Garment Specifications Card */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '14px', letterSpacing: '0.04em' }}>
                GARMENT SPECIFICATIONS
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SEWING STYLE</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>
                    {order.sewing_style_name_at_order || 'Standard Cut'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>FABRIC SPEC</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>
                    {order.fabric_name_at_order || 'Client Provided'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Ref: {order.fabric_reference_at_order || 'N/A'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>EMBROIDERY SPEC</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px', fontSize: '0.95rem' }}>
                    {order.design_name_at_order || 'None'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Code: {order.design_reference_at_order || 'Plain'}
                  </div>
                </div>
              </div>
            </div>

            {/* Ready Status Callout */}
            {order.status === 'READY' && (
              <div
                style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  padding: '16px',
                  borderRadius: '10px',
                  color: '#14532d',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                🎉 <strong>Your garment is ready!</strong> Tailoring and quality inspections are complete. {balanceRemaining > 0 ? `Please complete the final payment of ₦${balanceRemaining.toLocaleString()} above before delivery or collection.` : 'Your outfit is ready for immediate collection!'}
              </div>
            )}

            {/* Contact Support */}
            <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Need adjustments or customer support?{' '}
              </span>
              <a
                href={`https://wa.me/2348030635560?text=Hello%20Master%20HQ,%20I%20am%20inquiring%20about%20my%20order%20%23${order.order_reference}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#16a34a',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                Message Master HQ 💬
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}