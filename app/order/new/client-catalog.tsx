'use client';
import { verifyBankReceipt, VerificationResult } from '@/lib/verify-receipt';
import Image from 'next/image';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createNewOrderAction, checkReturningCustomerAction, getAtelierSettingsAction, submitOrderWithReceiptAction } from './actions';

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
  const [checkingCustomer, setCheckingCustomer] = useState(false);

  React.useEffect(() => {
    async function loadSettings() {
      try {
        const res = await getAtelierSettingsAction();
        if (res) setBankDetails(res);
      } catch (e) {
        console.error('Failed to load atelier bank settings:', e);
      }
    }
    loadSettings();
  }, []);

  const [returningPromptOpen, setReturningPromptOpen] = useState(false);

  // Bank Transfer & Receipt Verification States
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bankName: 'OPay',
    accountNumber: '8030635560',
    accountName: 'Abdulrahman Aliyu',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [verifyingReceipt, setVerifyingReceipt] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const [returningData, setReturningData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleProceedToStep2 = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Please enter your full name and phone number to continue.');
      return;
    }
    setErrorMessage('');
    
    // Check if customer has prior history
    setCheckingCustomer(true);
    try {
      const res = await checkReturningCustomerAction(customerPhone);
      if (res && res.found && res.profile && res.profile.measurements) {
        setReturningData(res.profile);
        setReturningPromptOpen(true);
        setCheckingCustomer(false);
        return;
      }
    } catch (err) {
      console.error('Customer lookup error:', err);
    }
    setCheckingCustomer(false);
    setCurrentStep(2);
  };

  const handleApplySavedMeasurements = () => {
    if (returningData && returningData.measurements) {
      setMeasurements((prev) => ({
        ...prev,
        ...returningData.measurements,
      }));
    }
    setReturningPromptOpen(false);
    setCurrentStep(2);
  };

  
  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankDetails.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    const objectUrl = URL.createObjectURL(file);
    setReceiptPreview(objectUrl);
    setVerificationResult(null);

    // Auto-verify with OCR
    setVerifyingReceipt(true);
    try {
      const amountDue = paymentPlan === '50_PERCENT' ? Math.round(totalPrice / 2) : totalPrice;
      const res = await verifyBankReceipt(
        file,
        bankDetails.accountNumber,
        bankDetails.accountName,
        amountDue
      );
      setVerificationResult(res);
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifyingReceipt(false);
    }
  };

  const handleCompleteOrderWithReceipt = async () => {
    if (!receiptFile) {
      alert('Please upload your transfer receipt to proceed.');
      return;
    }
    setSubmitting(true);
    try {
      const amountDue = paymentPlan === '50_PERCENT' ? Math.round(totalPrice / 2) : totalPrice;
      const formData = new FormData();
      formData.append(
        'orderData',
        JSON.stringify({
          customerName,
          customerPhone,
          sewingStyleId: selectedStyle?.id,
          embroideryDesignId: selectedDesign?.id,
          measurements,
          paymentPlan,
          totalAmount: totalPrice,
          amountToPay: amountDue,
        })
      );
      formData.append('receiptFile', receiptFile);
      if (verificationResult) {
        formData.append('verificationData', JSON.stringify(verificationResult.extractedData));
      }

      const res = await submitOrderWithReceiptAction(formData);
      if (res && res.success && res.orderReference) {
        setBankModalOpen(false);
        router.push(`/track?ref=${res.orderReference}`);
      } else {
        alert(res?.error || 'Failed to finalize order. Please try again.');
        setSubmitting(false);
      }
    } catch (err: any) {
      alert(err.message || 'Submission error');
      setSubmitting(false);
    }
  };

  const handleSkipSavedMeasurements = () => {
    setReturningPromptOpen(false);
    setCurrentStep(2);
  };


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
    
    
    const isBabbanRiga = selectedStyle?.name?.toLowerCase().includes('babban') || selectedStyle?.name?.toLowerCase().includes('baban');
    if (isBabbanRiga) {
      const babbanWidthId = '4e643bd4-85d3-475a-a0f7-28e9983a2b56';
      const babbanLengthId = 'ad35f082-95c9-47c2-ac86-37da805d4902';
      const wVal = Number(measurements[babbanWidthId]);
      const lVal = Number(measurements[babbanLengthId]);
      if (!wVal || wVal < 1 || !lVal || lVal < 1) return false;
    }

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
    setErrorMessage('');
    // Open in-app settlement modal for bank transfer & OCR receipt verification
    setBankModalOpen(true);
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
            
              {/* 0. Customer Identification */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
                  1. Customer Information
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Sani Musa"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                      WhatsApp / Phone Number <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                  </label>
                </div>
              </div>

              {/* 1. Style Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  2. Select Tailoring Garment
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
                onClick={handleProceedToStep2}
                disabled={!selectedStyle || checkingCustomer}
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

            
              {/* Group 4.5: Babban Riga Specific Dimensions (Conditional) */}
              {(selectedStyle?.name?.toLowerCase().includes('babban') || selectedStyle?.name?.toLowerCase().includes('baban')) && (
                <div style={{ padding: '16px 20px', background: '#f8fafc', border: '1.5px solid #0f172a', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#0f172a', textTransform: 'uppercase' }}>
                      Babban Riga Dimensions
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>
                      Required
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {/* Width of Babban riga / Fadin babban riga */}
                    <label style={{ display: 'grid', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                          Width of Babban riga / Fadin babban riga
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>
                          Required
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginBottom: '2px' }}>
                        (from spine to sleeve.)
                      </span>
                      <select
                        value={measurements['4e643bd4-85d3-475a-a0f7-28e9983a2b56'] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, '4e643bd4-85d3-475a-a0f7-28e9983a2b56': e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">Select a value</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>

                    {/* Length of Babban riga / Tsayin Babban riga */}
                    <label style={{ display: 'grid', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                          Length of Babban riga / Tsayin Babban riga
                        </span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '4px' }}>
                          Required
                        </span>
                      </div>
                      <div style={{ height: '18px' }} />
                      <select
                        value={measurements['ad35f082-95c9-47c2-ac86-37da805d4902'] || ''}
                        onChange={(e) => setMeasurements({ ...measurements, 'ad35f082-95c9-47c2-ac86-37da805d4902': e.target.value })}
                        style={{ width: '100%', minHeight: '44px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.95rem', cursor: 'pointer' }}
                      >
                        <option value="">Select a value</option>
                        {Array.from({ length: 120 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
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
              💳 {submitting ? 'Preparing Settlement...' : `Book & Settle ₦${payableToday.toLocaleString()} →`}
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
    
      {/* Returning Customer Confirmation Dialog */}
      {returningPromptOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'inline-flex', padding: '10px', background: '#dcfce7', borderRadius: '12px', color: '#16a34a', marginBottom: '16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Welcome back, {returningData?.customerName || customerName}!
            </h3>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: '1.5', margin: '0 0 20px' }}>
              We found measurements from your previous order (<strong>{returningData?.orderReference}</strong>). Would you like to automatically fill in your previous measurements?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSkipSavedMeasurements}
                style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                No, Enter Fresh
              </button>
              <button
                type="button"
                onClick={handleApplySavedMeasurements}
                style={{ padding: '12px', borderRadius: '10px', border: 'none', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Yes, Auto-fill
              </button>
            </div>
          </div>
        </div>
      )}


      {/* IN-APP BANK TRANSFER & RECEIPT VERIFICATION MODAL */}
      {bankModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '18px', maxWidth: '540px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Atelier Direct Settlement
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                  Bank Transfer & Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {/* Amount Banner */}
            <div style={{ background: '#0f172a', color: '#ffffff', padding: '18px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>
                  {paymentPlan === '50_PERCENT' ? '50% Initial Deposit Due' : '100% Full Payment Due'}
                </span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>
                  ₦{(paymentPlan === '50_PERCENT' ? Math.round(totalPrice / 2) : totalPrice).toLocaleString()}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                {selectedStyle?.name || 'Garment'}
              </span>
            </div>

            {/* Account Details Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Bank</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{bankDetails.bankName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Account Name</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{bankDetails.accountName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Account Number</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.05em', color: '#0f172a' }}>{bankDetails.accountNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  style={{ background: copiedAccount ? '#16a34a' : '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {copiedAccount ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Upload Receipt Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Upload Transfer Receipt (Screenshot / Photo) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px dashed #cbd5e1', background: '#fafafa', cursor: 'pointer', fontSize: '0.85rem' }}
              />

              {/* OCR Scanning Progress */}
              {verifyingReceipt && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>⏳</span>
                  <span style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>
                    Scanning receipt & checking 6 audit rules (Status, Account, Name, Amount, Date, Reference)...
                  </span>
                </div>
              )}

              {/* Verification Feedback Result */}
              {verificationResult && (
                <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', background: verificationResult.isValid ? '#f0fdf4' : '#fff1f2', border: `1.5px solid ${verificationResult.isValid ? '#86efac' : '#fecdd3'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{verificationResult.isValid ? '✓' : '⚠️'}</span>
                    <strong style={{ fontSize: '0.88rem', color: verificationResult.isValid ? '#166534' : '#991b1b' }}>
                      {verificationResult.isValid ? 'Receipt Verified Successfully!' : 'Verification Flagged Items'}
                    </strong>
                  </div>

                  {verificationResult.isValid ? (
                    <div style={{ fontSize: '0.78rem', color: '#15803d', display: 'grid', gap: '4px' }}>
                      <div>• Status: <strong>{verificationResult.extractedData.statusText}</strong></div>
                      <div>• Account: <strong>{verificationResult.extractedData.foundAccount}</strong></div>
                      <div>• Amount: <strong>₦{verificationResult.extractedData.foundAmount?.toLocaleString()}</strong></div>
                      <div>• Reference: <strong>{verificationResult.extractedData.referenceId}</strong></div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#991b1b' }}>
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        {verificationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      <p style={{ marginTop: '6px', fontSize: '0.73rem', fontStyle: 'italic', color: '#7f1d1d' }}>
                        You may still proceed with submission for manual workshop verification.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
              <button
                type="button"
                disabled={submitting || !receiptFile}
                onClick={handleCompleteOrderWithReceipt}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: !receiptFile ? '#94a3b8' : '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: !receiptFile ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submitting ? 'Confirming Order & Tracking...' : 'Confirm Payment & Track Order →'}
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  );
}
