'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createNewOrderAction, checkReturningCustomerAction } from './actions';

interface OrderCatalogClientProps {
  initialStyles?: any[] | null;
  initialDesigns?: any[] | null;
  initialStyleMeasurements?: any[] | null;
}

export default function OrderCatalogClient({
  initialStyles = [],
  initialDesigns = [],
  initialStyleMeasurements = [],
}: OrderCatalogClientProps) {
  const router = useRouter();
  const styles = Array.isArray(initialStyles) ? initialStyles : [];
  const designs = Array.isArray(initialDesigns) ? initialDesigns : [];
  const allStyleMeasurements = Array.isArray(initialStyleMeasurements) ? initialStyleMeasurements : [];

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [selectedStyle, setSelectedStyle] = useState<any>(styles[0] || null);
  const [selectedDesign, setSelectedDesign] = useState<any>(designs[0] || null);
  const [paymentPlan, setPaymentPlan] = useState<'50_PERCENT' | '100_PERCENT'>('50_PERCENT');

  // Measurements Map: { [measurement_definition_id]: integerString }
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  // Customer Contact (Step 3 - Optional)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [previewItem, setPreviewItem] = useState<{ url: string; title: string; price?: number } | null>(null);

  // 4. Custom Finishing Preferences (Optional)
  const [neckStyle, setNeckStyle] = useState("Tailor's Best Choice (Default)");
  const [pocketStyle, setPocketStyle] = useState("Tailor's Best Choice (Default)");
  const [cuffStyle, setCuffStyle] = useState("Tailor's Best Choice (Default)");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active measurements for selected style in exact display_order
  const activeMeasurements = useMemo(() => {
    if (!selectedStyle) return [];
    return allStyleMeasurements
      .filter((sm: any) => sm.sewing_style_id === selectedStyle.id && sm.measurement_definitions)
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((sm: any) => ({
        id: sm.measurement_definitions.id,
        name: sm.measurement_definitions.name,
        hausaName: sm.measurement_definitions.hausa_name,
        label: `${sm.measurement_definitions.name} / ${sm.measurement_definitions.hausa_name}`,
        isRequired: sm.is_required,
      }));
  }, [selectedStyle, allStyleMeasurements]);

  const isMeasurementsComplete = useMemo(() => {
    if (activeMeasurements.length === 0) return false;
    return activeMeasurements.every((item: any) => {
      const val = Number(measurements[item.id]);
      return Number.isInteger(val) && val >= 1 && val <= 120;
    });
  }, [activeMeasurements, measurements]);

  const stylePrice = Number(selectedStyle?.sewing_charge ?? selectedStyle?.base_price ?? 0);
  const designPrice = Number(selectedDesign?.price ?? selectedDesign?.base_price ?? 0);
  const totalPrice = stylePrice + designPrice;
  const payableToday = paymentPlan === '50_PERCENT' ? Math.round(totalPrice * 0.5) : totalPrice;

  async function handlePhoneLookup(phone: string) {
    setCustomerPhone(phone);
    if (phone.length >= 10) {
      const res = await checkReturningCustomerAction(phone);
      if (res && res.found && res.profile) {
        setCustomerName(res.profile.full_name || res.profile.name || customerName);
      }
    }
  }

  async function handleSubmitOrder() {
    if (!isMeasurementsComplete) {
      setErrorMessage('Please select a valid measurement value for every field.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const numericMeasurements: Record<string, number> = {};
    for (const [key, val] of Object.entries(measurements)) {
      numericMeasurements[key] = Number(val);
    }

    try {
      const res = await createNewOrderAction({
        sewingStyleId: selectedStyle.id,
        sewingStyleName: selectedStyle.name,
          sewingStyleImageUrl: selectedStyle?.image_url || null,
        sewingFee: stylePrice,
        designName: selectedDesign?.name || 'Standard Artwork',
        designCode: selectedDesign?.code || 'EMB-001',
        embroideryFee: designPrice,
          designImageUrl: selectedDesign?.image_url || null,
        paymentPlan,
        customerName: customerName.trim() || 'Walk-in Client',
        customerPhone: customerPhone.trim() || 'N/A',
        neckStyle,
        pocketStyle,
        cuffStyle,
        submittedMeasurements: numericMeasurements,
      });

      if (res && res.success === false) {
        setErrorMessage(res.error || 'Failed to submit order.');
        setSubmitting(false);
        return;
      }

      // Build WhatsApp Pre-filled Summary
      const tailorWhatsApp = "2348030635560"; // Replace with your atelier's official WhatsApp number
      
      const measurementsSummary = activeMeasurements
        .map((m: any) => `• ${m.label}: ${measurements[m.id] || '-'}"`)
        .join('\n');

            const formatChoice = (val: string) => {
        if (!val || val.includes("Tailor's Best Choice") || val.includes("Tailor's Best Choice")) {
          return "Tailor's Best Choice (Zabin Tela)";
        }
        return val;
      };

      const balanceAtPickup = totalPrice - payableToday;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const trackingUrl = `${origin}/track?query=${res.orderRef}`;

      const msg = 
`*MKTF BESPOKE ATELIER COMMISSION*
*Order Ref:* ${res.orderRef}
--------------------------------
*1. Sewing Cut:* ${selectedStyle?.name} (₦${stylePrice.toLocaleString()})
*2. Embroidery Artwork:* ${selectedDesign?.name || 'Selected Design'} [${selectedDesign?.code || 'EMB'}] (₦${designPrice.toLocaleString()})
*3. Finishing Specifications (Zabin Dinki):*
  • Collar / Neck (Wuya): ${formatChoice(neckStyle)}
  • Pocket Cut (Aljihu): ${formatChoice(pocketStyle)}
  • Sleeve / Cuff (Hannu): ${formatChoice(cuffStyle)}
*4. Pricing & Payment Choice:*
  • Total Bill: ₦${totalPrice.toLocaleString()}
  • Selected Plan: ${paymentPlan === '50_PERCENT' ? '50% Initial Deposit' : '100% Full Upfront Settlement'}
  • *Payable Today:* ₦${payableToday.toLocaleString()}
  • Balance at Pickup: ₦${balanceAtPickup.toLocaleString()}
*Live Workshop Tracking Link:*
${trackingUrl}
*Settlement Account Details:*
  • Bank: OPay
  • Account No: 8030635560
  • Account Name: Abdulrahman Aliyu
--------------------------------
Hello Master Abdulrahman! I have reviewed my selection above. I would like to confirm my order and transfer payment:`;

      const whatsappUrl = `https://wa.me/${tailorWhatsApp}?text=${encodeURIComponent(msg)}`;

      // Open WhatsApp in a new tab and redirect dashboard to success/orders
      window.open(whatsappUrl, '_blank');
      router.push('/admin/orders');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while creating order.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 20px 100px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <p style={{ margin: 0, color: '#10b981', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Step {currentStep} of 3
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 0 0', color: '#0f172a' }}>
            {currentStep === 1 && 'Select Outfit Cut & Embroidery'}
            {currentStep === 2 && 'Your Measurements'}
            {currentStep === 3 && 'Review Your Order'}
          </h1>
        </div>

        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ← Previous Step
          </button>
        )}
      </div>

      {/* ==================== STEP 1: CATALOG SELECTION ==================== */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          <div>
            {/* Cut Selection */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '14px' }}>
                1. Choose Tailoring Cut
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                {styles.map((style: any) => {
                  const isSelected = selectedStyle?.id === style.id;
                  const charge = Number(style.sewing_charge ?? style.base_price ?? 0);
                  return (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      style={{
                        border: isSelected ? '2.5px solid #4f46e5' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#ffffff',
                        boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ height: '140px', background: '#f8fafc', position: 'relative' }}>
    {style.image_url && (
      <button
        type="button"
        title="View Fullscreen"
        onClick={(e) => {
          e.stopPropagation();
          setPreviewItem({ url: style.image_url, title: style.name, price: charge });
        }}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '4px 7px',
          fontSize: '11px',
          cursor: 'pointer',
          zIndex: 10,
          backdropFilter: 'blur(4px)'
        }}
      >
        🔍 Zoom
      </button>
    )}
                        {style.image_url ? (
                          <img src={style.image_url} alt={style.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No Image</div>
                        )}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{style.name}</div>
                        <div style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem', marginTop: '2px' }}>
                          ₦{charge.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Artwork Selection */}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: '14px' }}>
                2. Choose Embroidery Artwork
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                {designs.map((ds: any) => {
                  const isSelected = selectedDesign?.id === ds.id;
                  const fee = Number(ds.price ?? ds.base_price ?? 0);
                  return (
                    <div
                      key={ds.id}
                      onClick={() => setSelectedDesign(ds)}
                      style={{
                        border: isSelected ? '2.5px solid #4f46e5' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#ffffff',
                        boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ height: '120px', background: '#f8fafc', position: 'relative' }}>
    {ds.image_url && (
      <button
        type="button"
        title="View Fullscreen"
        onClick={(e) => {
          e.stopPropagation();
          setPreviewItem({ url: ds.image_url, title: ds.name, price: fee });
        }}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '4px 7px',
          fontSize: '11px',
          cursor: 'pointer',
          zIndex: 10,
          backdropFilter: 'blur(4px)'
        }}
      >
        🔍 Zoom
      </button>
    )}
                        {ds.image_url ? (
                          <img src={ds.image_url} alt={ds.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No Image</div>
                        )}
                      </div>
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ds.name}
                        </div>
                        <div style={{ color: '#4f46e5', fontWeight: 700, fontSize: '0.82rem', marginTop: '2px' }}>
                          ₦{fee.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Summary Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', position: 'sticky', top: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>Order Breakdown</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Garment Style:</span>
              <span style={{ fontWeight: 700 }}>{selectedStyle?.name || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Sewing Cost:</span>
              <span style={{ fontWeight: 700 }}>₦{stylePrice.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Embroidery:</span>
              <span style={{ fontWeight: 700 }}>{selectedDesign?.code || selectedDesign?.name || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem' }}>
              <span style={{ color: '#64748b' }}>Embroidery Cost:</span>
              <span style={{ fontWeight: 700 }}>₦{designPrice.toLocaleString()}</span>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Atelier Fee:</span>
                <span style={{ color: '#059669' }}>₦{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={!selectedStyle}
              style={{
                width: '100%',
                background: selectedStyle ? '#0f172a' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: 800,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                cursor: selectedStyle ? 'pointer' : 'not-allowed',
                fontSize: '0.92rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              Continue to Measurements →
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: EXACT DROPDOWN MEASUREMENTS ==================== */}
      {currentStep === 2 && (
        <section aria-labelledby="measurements-heading" style={{ padding: '28px', border: '1px solid #dfe7e2', borderRadius: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 id="measurements-heading" style={{ margin: '4px 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>
              Your Measurements ({selectedStyle?.name})
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Select whole-number values (1–120) for each tailoring dimension.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '16px', marginBottom: '28px' }}>
            {activeMeasurements.map((item: any) => (
              <label key={item.id} style={{ display: 'grid', gap: '8px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fafbfa' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                  {item.label}
                </span>
                <select
                  value={measurements[item.id] || ''}
                  onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#ffffff',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a value</option>
                  {Array.from({ length: 120 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {!isMeasurementsComplete && (
                <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                  * Please select a value for every required measurement to continue.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                Back to Catalog
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={!isMeasurementsComplete}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isMeasurementsComplete ? '#0f172a' : '#cbd5e1',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: isMeasurementsComplete ? 'pointer' : 'not-allowed',
                }}
              >
                Review Order →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 3: REVIEW, PREFERENCES & PAYMENT ==================== */}
      {currentStep === 3 && (
        <section style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Details Box */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>Customer Contact (Optional)</h2>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>Leave blank for walk-in clients or input to link client profile.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ibrahim Shehu"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => handlePhoneLookup(e.target.value)}
                  placeholder="e.g. 0803 123 4567"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* 4. Custom Finishing Preferences (Optional) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>ًں‘”</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  4. Custom Finishing Preferences (Optional)
                </h2>
              </div>
              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.05em' }}>
                NO EXTRA CHARGE
              </span>
            </div>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.88rem' }}>
              If you do not choose, our master tailors will automatically use the best recommended cut for this garment.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Collar / Neck Cut */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Collar / Neck Cut
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    "Tailor's Best Choice (Default)",
                    "Mandarin / Nehru Collar",
                    "Round Neck (Kayan Koli)",
                    "Traditional Open Kufta",
                    "V-Neck Cut Style"
                  ].map((option) => {
                    const isSelected = neckStyle === option;
                    return (
                      <label
                        key={option}
                        onClick={() => setNeckStyle(option)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.86rem',
                          color: '#1e293b',
                        }}
                      >
                        <input
                          type="radio"
                          name="neckCut"
                          checked={isSelected}
                          onChange={() => setNeckStyle(option)}
                          style={{ accentColor: '#0f172a' }}
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Pocket Configuration */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Pocket Configuration
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    "Tailor's Best Choice (Default)",
                    "Single Chest Pocket + Slit",
                    "Concealed Invisible Side Slits Only",
                    "Dual Lower Front Pockets",
                    "No Visible External Pockets"
                  ].map((option) => {
                    const isSelected = pocketStyle === option;
                    return (
                      <label
                        key={option}
                        onClick={() => setPocketStyle(option)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.86rem',
                          color: '#1e293b',
                        }}
                      >
                        <input
                          type="radio"
                          name="pocketConfig"
                          checked={isSelected}
                          onChange={() => setPocketStyle(option)}
                          style={{ accentColor: '#0f172a' }}
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Sleeve & Cuff Finish */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Sleeve & Cuff Finish
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    "Tailor's Best Choice (Default)",
                    "Open Straight Sleeve",
                    "Button Slit Cuff",
                    "French Cuff (Cufflinks ready)",
                    "Embroidery Edged Cuffs"
                  ].map((option) => {
                    const isSelected = cuffStyle === option;
                    return (
                      <label
                        key={option}
                        onClick={() => setCuffStyle(option)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.86rem',
                          color: '#1e293b',
                        }}
                      >
                        <input
                          type="radio"
                          name="cuffFinish"
                          checked={isSelected}
                          onChange={() => setCuffStyle(option)}
                          style={{ accentColor: '#0f172a' }}
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 5. Choose Payment Model */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              5. Choose Payment Model
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* 50% Commitment */}
              <div
                onClick={() => setPaymentPlan('50_PERCENT')}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: paymentPlan === '50_PERCENT' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  background: paymentPlan === '50_PERCENT' ? '#ffffff' : '#fafbfa',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: paymentPlan === '50_PERCENT' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>50% Commitment Deposit</div>
                  <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
                    STANDARD
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                  Pay 50% now to begin cutting. Settle the other 50% when your outfit reaches final workshop finishing.
                </p>
              </div>

              {/* 100% Full */}
              <div
                onClick={() => setPaymentPlan('100_PERCENT')}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: paymentPlan === '100_PERCENT' ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  background: paymentPlan === '100_PERCENT' ? '#ffffff' : '#fafbfa',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: paymentPlan === '100_PERCENT' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>100% Full Upfront Settlement</div>
                  <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
                    ZERO BALANCE
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                  Clear all tailoring charges now. When tailoring finishes, outfit is released directly for delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Measurements Summary Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                Recorded Measurements ({activeMeasurements.length})
              </h3>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Edit Measurements
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
              {activeMeasurements.map((m: any) => (
                <div key={m.id} style={{ fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>{m.label}:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{measurements[m.id]}</strong>
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px', borderRadius: '8px' }}>
              {errorMessage}
            </div>
          )}

          {/* ==================== FIXED STICKY BOTTOM ACTION BAR ==================== */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '16px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SELECTION
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedStyle?.name} + {selectedDesign?.code || selectedDesign?.name}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '24px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TOTAL BILL
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  ₦{totalPrice.toLocaleString()}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '24px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  PAYABLE TODAY ({paymentPlan === '50_PERCENT' ? '50%' : '100%'})
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7' }}>
                  ₦{payableToday.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={submitting}
              style={{
                background: submitting ? '#64748b' : '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.98rem',
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                cursor: submitting ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              💬 {submitting ? 'Transmitting Order...' : `Book & Settle ₦${payableToday.toLocaleString()} via WhatsApp →`}
            </button>
          </div>

        </section>
      )}
    
      {/* Fullscreen Preview Lightbox Modal */}
      {previewItem && (
        <div
          onClick={() => setPreviewItem(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#0f172a',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1e293b' }}>
              <div>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{previewItem.title}</h3>
                {previewItem.price !== undefined && (
                  <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>₦{previewItem.price.toLocaleString()}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src={previewItem.url}
                alt={previewItem.title}
                style={{
                  maxWidth: '82vw',
                  maxHeight: '72vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                }}
              />
            </div>
          </div>
        </div>
      )}
  
</div>
  );
}
