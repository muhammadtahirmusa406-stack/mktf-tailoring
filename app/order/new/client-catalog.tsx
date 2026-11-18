'use client';
import { verifyBankReceipt, VerificationResult } from '@/lib/verify-receipt';
import Image from 'next/image';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createNewOrderAction, checkReturningCustomerAction, getAtelierSettingsAction, submitOrderWithReceiptAction, submitCustomDesignQuoteAction } from './actions';

interface OrderCatalogClientProps {
  initialStyles?: any[] | null;
  initialDesigns?: any[] | null;
  initialStyleMeasurements?: any[] | null;
}

async function compressImageForUpload(file: File, maxDim = 1400, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 450 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], cleanName, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
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

  const [selectedStyle, setSelectedStyle] = useState<any>(null);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isCustomDesign, setIsCustomDesign] = useState(false);
  const [customDesignFile, setCustomDesignFile] = useState<File | null>(null);
  const [customDesignPreview, setCustomDesignPreview] = useState<string | null>(null);
  const [customDesignNotes, setCustomDesignNotes] = useState('');
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
  const [highlightContact, setHighlightContact] = useState(false);

  React.useEffect(() => {
    const onStepKeys = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' && currentStep === 1) {
        e.preventDefault();
        handleProceedToStep2();
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        e.preventDefault();
        setCurrentStep((s) => (s === 4 ? 3 : s === 3 ? 2 : 1));
      }
    };
    window.addEventListener('keydown', onStepKeys);
    return () => window.removeEventListener('keydown', onStepKeys);
  });
  const customerInfoRef = React.useRef<HTMLDivElement | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const phoneInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleProceedToStep2 = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      const missingBoth = !customerName.trim() && !customerPhone.trim();
      const missingField = !customerName.trim() ? 'Full Name' : 'WhatsApp / Phone Number';
      setHighlightContact(true);
      setErrorMessage(
        missingBoth
          ? 'Hold on! Please enter your Full Name and WhatsApp / Phone Number first so we can link your design and generate your tracking code.'
          : `Almost there! Please enter your ${missingField} before continuing to measurements.`
      );
      if (customerInfoRef.current) {
        customerInfoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        if (!customerName.trim()) {
          nameInputRef.current?.focus();
        } else {
          phoneInputRef.current?.focus();
        }
      }, 320);
      return;
    }
    setHighlightContact(false);

    if (!selectedStyle) {
      setErrorMessage('Please choose a Tailoring Garment (cutting style) before continuing.');
      return;
    }
    if (!isCustomDesign && !selectedDesign) {
      setErrorMessage('Please select an Embroidery / Artwork design—or upload your own design photo—before continuing.');
      return;
    }
    if (isCustomDesign && !customDesignFile) {
      setErrorMessage('Please upload your custom design reference picture before continuing.');
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
    if (!verificationResult || !verificationResult.isValid) {
      const errorMsg = verificationResult?.errors?.length
        ? verificationResult.errors.map((e) => "- " + e).join("\n")
        : "Receipt verification failed. Please upload a clear official transfer receipt.";
      alert("Cannot proceed: The uploaded receipt failed verification.\n\nErrors:\n" + errorMsg);
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
          sewingStyleName: selectedStyle?.name || '',
          embroideryDesignId: selectedDesign?.id,
          designCode: selectedDesign?.code || selectedDesign?.design_code || '',
          designName: selectedDesign?.name || '',
          measurements: {
            ...measurements,
            sleeve_preference: sleevePreference,
            neck_style: neckStyle,
            pocket_style: pocketStyle,
            cuff_style: cuffStyle,
          },
          paymentPlan,
          totalAmount: totalPrice,
          amountToPay: amountDue,
        })
      );
      const optimizedReceiptFile = await compressImageForUpload(receiptFile);
      formData.append('receiptFile', optimizedReceiptFile);
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
        pushItem(it, it.rawSm ? it.rawSm.is_required : true, false, 'Other');
      }
    });

    // If style has no linked DB records, provide the 5 standard foundation cards + optional sub-dimensions
    if (orderedList.length === 0) {
      return [
        // 1. Shoulder
        { id: 'shoulder', name: 'Shoulder', hausaName: 'Kafada', label: 'Shoulder / Kafada', isRequired: true, isSub: false, parentGroup: 'Shoulder' },
        // 2. Sleeve + Optional Hand Opening
        { id: 'sleeve', name: 'Sleeve Length', hausaName: 'Hannu', label: 'Sleeve / Hannu', isRequired: true, isSub: false, parentGroup: 'Sleeve' },
        { id: 'hand_opening', name: 'Hand Opening', hausaName: 'Fadin Hannun', label: 'Hand Opening / Fadin Hannu', isRequired: false, isSub: true, parentGroup: 'Sleeve' },
        // 3. Shirt Length + Optional Shirt Width / Chest
        { id: 'shirt_length', name: 'Shirt Length', hausaName: 'Tsayin Riga', label: 'Shirt Length / Tsayin Riga', isRequired: true, isSub: false, parentGroup: 'Shirt' },
        { id: 'shirt_width', name: 'Shirt Width', hausaName: 'Fadin Riga', label: 'Shirt Width / Fadin Riga', isRequired: false, isSub: true, parentGroup: 'Shirt' },
        // 4. Neck
        { id: 'neck', name: 'Neck', hausaName: 'Wiya', label: 'Neck / Wiya', isRequired: true, isSub: false, parentGroup: 'Neck' },
        // 5. Trouser Length + Optional Waist & Leg Opening
        { id: 'trouser_length', name: 'Trouser Length', hausaName: 'Tsayin Wando', label: 'Trouser Length / Tsayin Wando', isRequired: true, isSub: false, parentGroup: 'Trouser' },
        { id: 'waist', name: 'Waist', hausaName: 'Kwankwaso', label: 'Waist / Kwankwaso', isRequired: false, isSub: true, parentGroup: 'Trouser' },
        { id: 'leg_opening', name: 'Leg Opening', hausaName: 'Fadin Kafar', label: 'Leg Opening / Fadin Kafar', isRequired: false, isSub: true, parentGroup: 'Trouser' }
      ];
    }

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
  const designPrice = isCustomDesign ? 0 : Number(selectedDesign?.price ?? selectedDesign?.base_price ?? 0);
  const totalPrice = isCustomDesign ? 0 : stylePrice + designPrice;
  const payableToday = isCustomDesign ? 0 : (paymentPlan === '50_PERCENT' ? Math.round(totalPrice * 0.5) : totalPrice);

  async function handleSubmitOrder() {
    if (!isMeasurementsComplete) {
      setErrorMessage('Please select a valid measurement value for every required field.');
      return;
    }
    setErrorMessage('');

    if (isCustomDesign) {
      if (!customDesignFile) {
        setErrorMessage('Please upload a photo or sketch of your custom design before submitting.');
        return;
      }
      setSubmitting(true);
      try {
        const fd = new FormData();
        fd.append(
          'orderData',
          JSON.stringify({
            customerName,
            customerPhone,
            sewingStyleId: selectedStyle?.id,
            sewingStyleName: selectedStyle?.name || '',
            customDesignNotes,
            paymentPlan,
            measurements: {
              ...measurements,
              sleeve_preference: sleevePreference,
              neck_style: neckStyle,
              pocket_style: pocketStyle,
              cuff_style: cuffStyle,
            },
          })
        );
        const optimizedDesignFile = await compressImageForUpload(customDesignFile);
        fd.append('customDesignFile', optimizedDesignFile);
        const res = await submitCustomDesignQuoteAction(fd);
        if (res && res.success && res.orderReference) {
          router.push(`/track?ref=${res.orderReference}`);
        } else {
          setErrorMessage(res?.error || 'Could not submit custom design request.');
          setSubmitting(false);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Submission error');
        setSubmitting(false);
      }
      return;
    }

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
            
              {/* 1. High-Visibility Customer Identification Card */}
              <div
                ref={customerInfoRef}
                style={{
                  background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 55%, #f8fafc 100%)',
                  padding: '22px',
                  borderRadius: '16px',
                  border: highlightContact ? '2.5px solid #dc2626' : '2px solid #f59e0b',
                  boxShadow: highlightContact
                    ? '0 10px 28px rgba(220, 38, 38, 0.16)'
                    : '0 8px 24px rgba(245, 158, 11, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0f172a', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                      1
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      Customer Information
                    </h2>
                  </div>

                  {customerName.trim() && customerPhone.trim() ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '9999px' }}>
                      ✓ Contact Details Ready
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', padding: '4px 10px', borderRadius: '9999px' }}>
                      ★ Required First Step
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 14px', fontSize: '0.83rem', color: '#475569' }}>
                  Enter your name and active phone number so we can save your measurements and generate your order tracking receipt.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                      Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <input
                      ref={nameInputRef} enterKeyHint="next" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); phoneInputRef.current?.focus(); } }}
                      type="text"
                      placeholder="e.g. Sani Musa"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errorMessage) setErrorMessage('');
                        if (highlightContact && e.target.value.trim() && customerPhone.trim()) setHighlightContact(false);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: highlightContact && !customerName.trim() ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.96rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                      WhatsApp / Phone Number <span style={{ color: '#dc2626' }}>*</span>
                    </span>
                    <input
                      ref={phoneInputRef} inputMode="tel" enterKeyHint="go" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleProceedToStep2(); } }}
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (errorMessage) setErrorMessage('');
                        if (highlightContact && customerName.trim() && e.target.value.trim()) setHighlightContact(false);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: highlightContact && !customerPhone.trim() ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.96rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  3. Select Embroidery / Artwork
                </h2>
                {isCustomDesign ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '3px 10px', borderRadius: '20px' }}>
                    ✨ Custom Design Quote Selected
                  </span>
                ) : selectedDesign ? (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px' }}>
                    ✓ {selectedDesign.name || selectedDesign.code} Selected
                  </span>
                ) : null}
              </div>

              {/* Custom Design Option Banner (High-Visibility Bespoke Upload) */}
              <div
                onClick={() => {
                  setIsCustomDesign(true);
                  setSelectedDesign(null);
                }}
                style={{
                  border: isCustomDesign ? '3px solid #f59e0b' : '2px solid #f59e0b',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  background: isCustomDesign
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  boxShadow: isCustomDesign
                    ? '0 10px 25px rgba(245, 158, 11, 0.22)'
                    : '0 10px 24px rgba(15, 23, 42, 0.18)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '230px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: isCustomDesign ? '#92400e' : '#0f172a',
                        background: '#fbbf24',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        marginBottom: '8px',
                      }}
                    >
                      ✨ Bespoke Photo Upload • Custom Quote
                    </span>
                    <div style={{ fontSize: '1.08rem', fontWeight: 900, color: isCustomDesign ? '#0f172a' : '#ffffff' }}>
                      Have Your Own Design? Upload Photo for Custom Quote
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: '0.85rem', lineHeight: 1.5, color: isCustomDesign ? '#475569' : '#cbd5e1' }}>
                      Didn&apos;t see your preferred embroidery in our catalogue? Upload your own sample picture and negotiate the price directly in-app before paying any deposit.
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      color: isCustomDesign ? '#ffffff' : '#0f172a',
                      background: isCustomDesign ? '#b45309' : '#f59e0b',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isCustomDesign ? '✓ Custom Design Active' : '📸 Upload Own Design →'}
                  </span>
                </div>

                {isCustomDesign && (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #fde68a', display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                        Upload Design Reference Picture / Sketch <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setCustomDesignFile(f);
                          setCustomDesignPreview(f ? URL.createObjectURL(f) : null);
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #fcd34d', background: '#ffffff', fontSize: '0.85rem' }}
                      />
                      {customDesignPreview && (
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img src={customDesignPreview} alt="Custom design preview" style={{ width: '76px', height: '76px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                          <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>✓ Design image attached</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                        Design Description &amp; Thread Preferences
                      </label>
                      <textarea
                        rows={2}
                        value={customDesignNotes}
                        onChange={(e) => setCustomDesignNotes(e.target.value)}
                        placeholder="e.g. Heavy gold thread embroidery on chest, collar, and cuffs..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.88rem' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {designs.map((ds: any) => {
                  const isSelected = !isCustomDesign && selectedDesign?.id === ds.id;
                  const price = Number(ds.price ?? ds.base_price ?? 0);
                  return (
                    <div
                      key={ds.id}
                      onClick={() => {
                        setIsCustomDesign(false);
                        setSelectedDesign(ds);
                      }}
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
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {isCustomDesign ? '✨ Custom Upload' : (selectedDesign?.code || selectedDesign?.name || '—')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#64748b' }}>Embroidery Cost:</span>
                <span style={{ fontWeight: 700, color: isCustomDesign ? '#b45309' : '#0f172a' }}>
                  {isCustomDesign ? 'To Be Quoted' : `₦${designPrice.toLocaleString()}`}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginBottom: '20px' }}>
              {isCustomDesign ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.45 }}>
                  <strong>Custom Quote Flow:</strong> Submit your measurements &amp; design free now. You will receive our price quote in-app, negotiate if needed, and pay your 50% or 100% deposit once agreed.
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {errorMessage && (
              <div
                role="alert"
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                  color: '#991b1b',
                  fontSize: '0.83rem',
                  fontWeight: 700,
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1.2 }}>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleProceedToStep2}
              disabled={checkingCustomer}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: checkingCustomer ? 'wait' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {checkingCustomer ? 'Checking Profile...' : 'Continue to Measurements →'}
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
              <strong>Need a special customization?</strong> Add your notes with your order and message the Master Tailor directly inside your in-app tracking &amp; negotiation portal—no external apps required!
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
              💳 {submitting ? (isCustomDesign ? 'Submitting Quote Request...' : 'Preparing Settlement...') : isCustomDesign ? 'Submit Custom Design for Quote →' : `Book & Settle ₦${payableToday.toLocaleString()} →`}
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
