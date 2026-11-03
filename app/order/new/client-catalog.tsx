'use client';
import Image from 'next/image';

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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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
  const [sleevePreference, setSleevePreference] = useState<string>("Tailor's Best Choice / Zabin Tela");
  const [cuffStyle, setCuffStyle] = useState("Tailor's Best Choice (Default)");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Active measurements for selected style in exact display_order
  // Categorized and ordered measurements with parent/sub hierarchy and optional flags
  const categorizedMeasurements = useMemo(() => {
    if (!selectedStyle) return [];

    const currentStyleItems = allStyleMeasurements
      .filter((sm: any) => sm.sewing_style_id === selectedStyle.id && sm.measurement_definitions)
      .map((sm: any) => ({
        id: sm.measurement_definitions.id,
        name: sm.measurement_definitions.name,
        hausaName: sm.measurement_definitions.hausa_name,
        label: `${sm.measurement_definitions.name} / ${sm.measurement_definitions.hausa_name}`,
        rawSm: sm,
      }));

    // Exact finder helpers matching your database strings
    const findItem = (pattern: RegExp) => {
      return currentStyleItems.find((it: any) => pattern.test(it.name) || pattern.test(it.hausaName) || pattern.test(it.label));
    };

        const shoulderItem = findItem(new RegExp('shoulder|kafada', 'i'));
    const sleeveItem = findItem(new RegExp('^sleeve|sleeve\\s*\\/|sleeve\\b', 'i')) || currentStyleItems.find((it: any) => /sleeve/i.test(it.name) && !/hand/i.test(it.name));
    const handOpeningItem = findItem(new RegExp('hand\\s*opening|fadin\\s*hannun', 'i'));
    const shirtLengthItem = findItem(new RegExp('shirt\\s*length|tsayin\\s*riga', 'i'));
    const shirtWidthItem = findItem(new RegExp('shirt\\s*width|fadin\\s*riga', 'i'));
    const neckItem = findItem(new RegExp('neck|wiya', 'i'));
    const trouserLengthItem = findItem(new RegExp('trouser\\s*length|tsayin\\s*wando', 'i'));
    const waistItem = findItem(new RegExp('waist|kwankwas', 'i'));
    const legOpeningItem = findItem(new RegExp('leg\\s*opening|fadin\\s*kafar', 'i'));

    const orderedList: any[] = [];
    const usedIds = new Set<string>();

    const pushItem = (item: any, isRequired: boolean, isSub: boolean, parentGroup: string) => {
      if (!item || usedIds.has(item.id)) return;
      usedIds.add(item.id);
      orderedList.push({
        ...item,
        isRequired,
        isSub,
        parentGroup,
      });
    };

    // 1. Shoulder / Kafada (Required)
    pushItem(shoulderItem, true, false, 'Shoulder');

    // 2. Sleeve / Hannu (Required) + Sub: Hand opening (Optional)
    pushItem(sleeveItem, true, false, 'Sleeve');
    pushItem(handOpeningItem, false, true, 'Sleeve');

    // 3. Shirt Length / Tsayin Riga (Required) + Sub: Shirt width (Optional)
    pushItem(shirtLengthItem, true, false, 'Shirt');
    pushItem(shirtWidthItem, false, true, 'Shirt');

    // 4. Neck / Wiya (Required)
    pushItem(neckItem, true, false, 'Neck');

    // 5. Trouser Length / Tsayin Wando (Required) + Sub: Waist (Optional) + Sub: Leg Opening (Optional)
    pushItem(trouserLengthItem, true, false, 'Trouser');
    pushItem(waistItem, false, true, 'Trouser');
    pushItem(legOpeningItem, false, true, 'Trouser');

    // Any remaining items fallback
    currentStyleItems.forEach((it: any) => {
      if (!usedIds.has(it.id)) {
        pushItem(it, it.rawSm.is_required, false, 'Other');
      }
    });

    return orderedList;
  }, [selectedStyle, allStyleMeasurements]);

  const activeMeasurements = categorizedMeasurements;

  // Validation: only isRequired fields block continuing; optional fields validated only if filled
  const isMeasurementsComplete = useMemo(() => {
    if (!categorizedMeasurements || categorizedMeasurements.length === 0) return true;
    
    // The 5 fundamental bespoke measurements required for Kaftan / Babban Riga
    const requiredItems = categorizedMeasurements.filter((m: any) => m.isRequired && m.parentGroup !== 'Other');
    
    return requiredItems.every((item: any) => {
      const val = measurements[item.id];
      if (val === undefined || val === null || val === '') return false;
      const num = Number(val);
      return !isNaN(num) && num >= 1 && num <= 120;
    });
  }, [categorizedMeasurements, measurements]);

  const stylePrice = Number(selectedStyle?.sewing_charge ?? selectedStyle?.base_price ?? 0);
  const designPrice = Number(selectedDesign?.price ?? selectedDesign?.base_price ?? 0);
  const totalPrice = stylePrice + designPrice;
  const payableToday = paymentPlan === '50_PERCENT' ? Math.round(totalPrice * 0.5) : totalPrice;

  async function handleSubmitOrder() {
    if (!isMeasurementsComplete) {
      setErrorMessage('Please select a valid measurement value for every required field.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const numericMeasurements: Record<string, number> = {};
    for (const [key, val] of Object.entries(measurements)) {
      if (val !== undefined && val !== '') {
        numericMeasurements[key] = Number(val);
      }
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
        customerPhone: customerPhone.trim(),
        deliveryDays: selectedStyle.turnaround_days || 7,
          measurements: numericMeasurements,
          submittedMeasurements: numericMeasurements,
          cuffStyle: sleevePreference || cuffStyle,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit order.');
        setSubmitting(false);
        return;
      }

      // WhatsApp Pre-filled Summary
        const tailorWhatsApp = "2348030635560";
        const balanceAtPickup = totalPrice - payableToday;
        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const trackingUrl = `${origin}/track?query=${res.orderRef}`;

        const formatChoice = (val: string) => {
          if (!val || val.includes('Default') || val.includes('Tailor')) {
            return "Tailor's Best Choice (Zabin Tela)";
          }
          return val;
        };

        const activeMeasurementItems = (categorizedMeasurements && categorizedMeasurements.length > 0)
          ? categorizedMeasurements
          : allStyleMeasurements;

        const measurementsList = activeMeasurementItems
          .filter((m: any) => numericMeasurements[m.id] !== undefined)
          .map((m: any) => `  • ${m.label || m.name || 'Measurement'}: ${numericMeasurements[m.id]}"`)
          .join('\n');

        const msgText = 
`*MKTF BESPOKE ATELIER COMMISSION*
*Order Ref:* ${res.orderRef}
--------------------------------
*Customer:* ${customerName.trim() || 'Walk-in Client'}
*Phone:* ${customerPhone.trim() || 'N/A'}
--------------------------------
*1. Sewing Cut:* ${selectedStyle?.name} (₦${stylePrice.toLocaleString()})
*2. Embroidery Artwork:* ${selectedDesign?.name || 'Selected Design'} [${selectedDesign?.code || 'EMB'}] (₦${designPrice.toLocaleString()})
*3. Finishing Specifications (Zabin Dinki):*
  • Collar / Neck (Wuya): ${formatChoice(neckStyle)}
  • Pocket Cut (Aljihu): ${formatChoice(pocketStyle)}
  • Sleeve / Cuff (Hannu): ${formatChoice(sleevePreference || cuffStyle)}
*4. Measurements:*
${measurementsList || '  • Captured at Workshop'}
*5. Pricing & Payment Choice:*
  • Total Bill: ₦${totalPrice.toLocaleString()}
  • Selected Plan: ${paymentPlan === '50_PERCENT' ? '50% Initial Deposit' : '100% Full Upfront Settlement'}
  • *Payable Today:* ₦${payableToday.toLocaleString()}
  • Balance at Pickup: ₦${balanceAtPickup.toLocaleString()}
--------------------------------
*Live Workshop Tracking Link:*
${trackingUrl}
--------------------------------
*Settlement Account Details:*
  • Bank: OPay
  • Account No: 8030635560
  • Account Name: Abdulrahman Aliyu
--------------------------------
Hello Master Abdulrahman! I have reviewed my selection above. I would like to confirm my order and transfer payment:`;

        window.open(`https://wa.me/${tailorWhatsApp}?text=${encodeURIComponent(msgText)}`, '_blank');
        router.push(`/order/success?ref=${res.orderRef}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server error.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header & Steps Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', color: '#b45309', textTransform: 'uppercase' }}>
            Bespoke Intake • Step {currentStep} of 4
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
            {currentStep === 1 && 'Select Style & Artwork'}
            {currentStep === 2 && 'Your Measurements'}
            {currentStep === 3 && 'Finishing Preferences'}
            {currentStep === 4 && 'Review Your Order'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                background: currentStep === step ? '#0f172a' : currentStep > step ? '#10b981' : '#e2e8f0',
                color: currentStep >= step ? '#ffffff' : '#64748b',
                transition: 'all 0.2s',
              }}
            >
              {currentStep > step ? '✓' : step}
            </div>
          ))}
        </div>
      </div>

      {/* ==================== STEP 1: CATALOG & STICKY SUMMARY ==================== */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* Main Selectors Column */}
          <div style={{ display: 'grid', gap: '32px' }}>
            {/* 1. Style Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  1. Select Tailoring Garment
                </h2>
                {selectedStyle && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
                    ✓ {selectedStyle.name} Selected
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {styles.map((st: any) => {
                  const isSelected = selectedStyle?.id === st.id;
                  const price = Number(st.sewing_charge ?? st.base_price ?? 0);
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStyle(st)}
                      style={{
                        border: isSelected ? '2.5px solid #0f172a' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        boxShadow: isSelected ? '0 6px 16px rgba(15,23,42,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease-in-out',
                        position: 'relative',
                      }}
                    >
                      {st.image_url ? (
                        <div
                          style={{ position: 'relative', width: '100%', height: '170px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem({ url: st.image_url, title: st.name, price });
                          }}
                        >
                          <Image src={st.image_url} alt={st.name} fill style={{ objectFit: 'cover' }} />
                          <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            🔍 Zoom
                          </span>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '170px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          No Preview
                        </div>
                      )}
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '2px 0', color: '#0f172a' }}>{st.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', fontWeight: 700 }}>
                        ₦{price.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Embroidery / Artwork Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  2. Select Embroidery / Artwork
                </h2>
                {selectedDesign && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
                    ✓ {selectedDesign.name || selectedDesign.code} Selected
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {designs.map((ds: any) => {
                  const isSelected = selectedDesign?.id === ds.id;
                  const price = Number(ds.price ?? ds.base_price ?? 0);
                  return (
                    <div
                      key={ds.id}
                      onClick={() => setSelectedDesign(ds)}
                      style={{
                        border: isSelected ? '2.5px solid #0f172a' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        boxShadow: isSelected ? '0 6px 16px rgba(15,23,42,0.1)' : '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease-in-out',
                        position: 'relative',
                      }}
                    >
                      {ds.image_url ? (
                        <div
                          style={{ position: 'relative', width: '100%', height: '170px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem({ url: ds.image_url, title: ds.name || ds.code, price });
                          }}
                        >
                          <Image src={ds.image_url} alt={ds.name || 'Artwork'} fill style={{ objectFit: 'cover' }} />
                          <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            🔍 Zoom
                          </span>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '170px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          Standard Artwork
                        </div>
                      )}
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '2px 0', color: '#0f172a' }}>{ds.name || ds.code}</h3>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', fontWeight: 700 }}>
                        ₦{price.toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Persistent Side Calculator / Order Breakdown Sidebar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              position: 'sticky',
              top: '24px',
              boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Order Breakdown</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                LIVE CALCULATOR
              </span>
            </div>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Garment Cut:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedStyle?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Sewing Cost:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₦{stylePrice.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Embroidery Art:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedDesign?.code || selectedDesign?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Embroidery Cost:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₦{designPrice.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>Total Atelier Fee:</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>₦{totalPrice.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Payable (100% / 50%):</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>
                  ₦{payableToday.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={!selectedStyle}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '10px',
                background: selectedStyle ? '#0f172a' : '#cbd5e1',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.96rem',
                border: 'none',
                cursor: selectedStyle ? 'pointer' : 'not-allowed',
                boxShadow: selectedStyle ? '0 4px 12px rgba(15,23,42,0.18)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {selectedStyle ? 'Continue to Measurements →' : 'Pick a Garment to Continue'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: STRUCTURED HIERARCHICAL MEASUREMENTS ==================== */}
      {currentStep === 2 && (
        <section aria-labelledby="measurements-heading" style={{ padding: '28px', border: '1px solid #dfe7e2', borderRadius: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 id="measurements-heading" style={{ margin: '4px 0 6px', fontSize: '1.4rem', fontWeight: 800 }}>
              Your Measurements ({selectedStyle?.name})
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Select whole-number values (1–120) for each tailoring dimension. Sub-measurements marked Optional are flexible.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
            {/* Group 1: Shoulder */}
            {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Shoulder').length > 0 && (
              <div style={{ padding: '16px 20px', background: '#fafbfa', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  1. Shoulder Dimension
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Shoulder').map((item: any) => (
                    <label key={item.id} style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>Required</span>
                      </div>
                      <select
                        value={measurements[item.id] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">Select a value</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Group 2: Sleeve & Hand Opening */}
            {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Sleeve').length > 0 && (
              <div style={{ padding: '16px 20px', background: '#fafbfa', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  2. Sleeve & Arm Measurements
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Sleeve').map((item: any) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'grid',
                        gap: '6px',
                        padding: item.isSub ? '12px 14px' : '0',
                        background: item.isSub ? '#f1f5f9' : 'transparent',
                        borderRadius: item.isSub ? '10px' : '0',
                        borderLeft: item.isSub ? '3px solid #64748b' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: item.isSub ? 700 : 800, fontSize: '0.88rem', color: '#0f172a' }}>
                          {item.isSub ? '↳ ' : ''}{item.label}
                        </span>
                        {item.isRequired ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>Required</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '2px 7px', borderRadius: '4px' }}>Optional</span>
                        )}
                      </div>
                      <select
                        value={measurements[item.id] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">{item.isRequired ? 'Select a value' : 'Select a value (Optional)'}</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Group 3: Shirt Length & Shirt Width */}
            {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Shirt').length > 0 && (
              <div style={{ padding: '16px 20px', background: '#fafbfa', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  3. Shirt Body (Riga)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Shirt').map((item: any) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'grid',
                        gap: '6px',
                        padding: item.isSub ? '12px 14px' : '0',
                        background: item.isSub ? '#f1f5f9' : 'transparent',
                        borderRadius: item.isSub ? '10px' : '0',
                        borderLeft: item.isSub ? '3px solid #64748b' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: item.isSub ? 700 : 800, fontSize: '0.88rem', color: '#0f172a' }}>
                          {item.isSub ? '↳ ' : ''}{item.label}
                        </span>
                        {item.isRequired ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>Required</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '2px 7px', borderRadius: '4px' }}>Optional</span>
                        )}
                      </div>
                      <select
                        value={measurements[item.id] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">{item.isRequired ? 'Select a value' : 'Select a value (Optional)'}</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Group 4: Neck / Wiya */}
            {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Neck').length > 0 && (
              <div style={{ padding: '16px 20px', background: '#fafbfa', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  4. Neck Dimension (Wiya)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Neck').map((item: any) => (
                    <label key={item.id} style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.label}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>Required</span>
                      </div>
                      <select
                        value={measurements[item.id] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">Select a value</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Group 5: Trouser Length, Waist, Leg Opening */}
            {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Trouser').length > 0 && (
              <div style={{ padding: '16px 20px', background: '#fafbfa', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  5. Trouser Dimensions (Wando)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {categorizedMeasurements.filter((m: any) => m.parentGroup === 'Trouser').map((item: any) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'grid',
                        gap: '6px',
                        padding: item.isSub ? '12px 14px' : '0',
                        background: item.isSub ? '#f1f5f9' : 'transparent',
                        borderRadius: item.isSub ? '10px' : '0',
                        borderLeft: item.isSub ? '3px solid #64748b' : undefined,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: item.isSub ? 700 : 800, fontSize: '0.88rem', color: '#0f172a' }}>
                          {item.isSub ? '↳ ' : ''}{item.label}
                        </span>
                        {item.isRequired ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>Required</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '2px 7px', borderRadius: '4px' }}>Optional</span>
                        )}
                      </div>
                      <select
                        value={measurements[item.id] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, [item.id]: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">{item.isRequired ? 'Select a value' : 'Select a value (Optional)'}</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
                Continue to Preferences →
              </button>
            </div>
          </div>
        </section>
      )}

      

      {/* ==================== STEP 3: FINISHING PREFERENCES ==================== */}
      {currentStep === 3 && (
        <section
          aria-labelledby="preferences-heading"
          style={{
            padding: '28px',
            border: '1px solid #dfe7e2',
            borderRadius: '16px',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', color: '#b45309', textTransform: 'uppercase' }}>
              Tailoring Finishing / Zabin Dinki
            </span>
            <h2 id="preferences-heading" style={{ margin: '4px 0 6px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Select Your Sleeve & Finishing Preference
            </h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
              Choose your preferred sleeve style cut for this garment.
            </p>
          </div>

          {/* Options Grid */}
          <div style={{ display: 'grid', gap: '14px', marginBottom: '28px' }}>
            {[
              {
                id: 'zabin-tela',
                title: "1. Tailor's Best Choice / Zabin Tela",
                desc: 'Our master tailor determines the best matching finish based on your garment and measurements.',
              },
              {
                id: 'flat-hand',
                title: '2. Flat Hand Opening',
                desc: 'Clean, open sleeve finish without buttons or cuffs. Traditional and comfortable.',
              },
              {
                id: 'cuff-sleeve',
                title: '3. A Sleeve with a Cuff / Hannun Mai Ling',
                desc: 'Structured cuff finishing with cufflinks/button slot for a formal bespoke presentation.',
              },
            ].map((option) => {
              const isSelected = sleevePreference === option.title;
              return (
                <div
                  key={option.id}
                  onClick={() => setSleevePreference(option.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                    background: isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(15,23,42,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="sleevePreference"
                    value={option.title}
                    checked={isSelected}
                    onChange={() => setSleevePreference(option.title)}
                    style={{ marginTop: '3px', cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: isSelected ? '#0f172a' : '#1e293b' }}>
                      {option.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      {option.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friendly Note Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              marginBottom: '28px',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>💬</span>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', lineHeight: 1.5, fontWeight: 500 }}>
              <strong>Need a special customization?</strong> If you have any other preferences, feel free to contact the admin via our <strong>WhatsApp Help</strong> button above anytime!
            </p>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Measurements
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Review Your Order →
            </button>
          </div>
        </section>
      )}

      {/* ==================== STEP 4: REVIEW ORDER ==================== */}
      {currentStep === 4 && (
        <section aria-labelledby="review-heading" style={{ padding: '28px', border: '1px solid #dfe7e2', borderRadius: '16px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h2 id="review-heading" style={{ margin: '0 0 20px', fontSize: '1.4rem', fontWeight: 800 }}>Review Your Bespoke Order</h2>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
            {/* Customer Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ibrahim Lawal"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>WhatsApp Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 08031234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
            </div>

            {/* Payment Options */}
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px' }}>
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Selected Sleeve Finish:</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{sleevePreference}</strong>
              </div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '10px' }}>Settlement Plan</label>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="paymentPlan"
                    value="100_PERCENT"
                    checked={paymentPlan === '100_PERCENT'}
                    onChange={() => setPaymentPlan('100_PERCENT')}
                  />
                  100% Full Payment (₦{totalPrice.toLocaleString()})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="paymentPlan"
                    value="50_PERCENT"
                    checked={paymentPlan === '50_PERCENT'}
                    onChange={() => setPaymentPlan('50_PERCENT')}
                  />
                  50% Initial Commitment Deposit (₦{Math.round(totalPrice * 0.5).toLocaleString()})
                </label>
              </div>
            </div>

            {/* Recorded Measurements Summary */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                  Recorded Measurements
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
                {categorizedMeasurements.map((m: any) => {
                  const val = measurements[m.id];
                  return (
                    <div key={m.id} style={{ fontSize: '0.82rem' }}>
                      <span style={{ color: '#64748b' }}>{m.label}:</span>{' '}
                      <strong style={{ color: val ? '#0f172a' : '#94a3b8' }}>
                        {val ? `${val}"` : '(Not set)'}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMessage && (
            <p style={{ color: '#dc2626', fontSize: '0.88rem', fontWeight: 700, marginBottom: '16px' }}>
              {errorMessage}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              style={{ padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Back to Preferences
            </button>
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
