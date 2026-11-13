'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import ImageLightboxModal from '@/components/ui/image-lightbox-modal';
import { verifyBankReceipt, VerificationResult } from '@/lib/verify-receipt';
import { settleBalanceWithReceiptAction, submitDeliveryPreferenceAction, respondToCustomQuoteAction, payAcceptedCustomQuoteAction } from './actions';

export default function TrackOrderPageClient({
  order,
  customerOrders = [],
  rawQuery,
  searched,
}: any) {
  const [activeOrder, setActiveOrder] = useState<any>(order || (customerOrders.length > 0 ? customerOrders[0] : null));

  useEffect(() => {
    setActiveOrder(order || (customerOrders.length > 0 ? customerOrders[0] : null));
  }, [order, customerOrders]);
  const [copied, setCopied] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [lightboxImg, setLightboxImg] = useState<{ src: string; title: string } | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [settling, setSettling] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [deliveryFormOpen, setDeliveryFormOpen] = useState(false);
  const [deliveryState, setDeliveryState] = useState('');
  const [deliveryLga, setDeliveryLga] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryAltPhone, setDeliveryAltPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [negotiationMsg, setNegotiationMsg] = useState('');
  const [submittingQuoteReply, setSubmittingQuoteReply] = useState(false);
  const [customDepositPlan, setCustomDepositPlan] = useState<'50_PERCENT' | '100_PERCENT'>('50_PERCENT');

  const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
    'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
    'Taraba', 'Yobe', 'Zamfara'
  ];

  useEffect(() => {
    setDeliveryFormOpen(activeOrder?.delivery_method === 'delivery');
    setDeliveryState(activeOrder?.delivery_state || '');
    setDeliveryLga(activeOrder?.delivery_lga || '');
    // Extract street portion if combined address was previously stored
    const rawAddr = activeOrder?.delivery_address || '';
    const streetOnly = activeOrder?.delivery_lga && rawAddr.includes(`, ${activeOrder.delivery_lga} LGA`)
      ? rawAddr.split(`, ${activeOrder.delivery_lga} LGA`)[0]
      : rawAddr;
    setDeliveryAddress(streetOnly);
    setDeliveryPhone(activeOrder?.delivery_phone || activeOrder?.customer_phone || '');
    setDeliveryAltPhone(activeOrder?.delivery_alt_phone || '');
    setDeliveryNotes(activeOrder?.delivery_notes || '');
  }, [activeOrder?.id]);

  const handleDeliverySubmit = async (method: 'pickup' | 'delivery') => {
    if (!activeOrder?.order_reference) return;
    if (method === 'delivery') {
      if (!deliveryState.trim()) {
        alert('Please select your State.');
        return;
      }
      if (!deliveryLga.trim()) {
        alert('Please enter your LGA (Local Government Area).');
        return;
      }
      if (!deliveryAddress.trim()) {
        alert('Please enter your street address.');
        return;
      }
    }
    setSavingDelivery(true);
    try {
      const res = await submitDeliveryPreferenceAction({
        orderReference: activeOrder.order_reference,
        deliveryMethod: method,
        deliveryState,
        deliveryLga,
        deliveryAddress,
        deliveryPhone,
        deliveryAltPhone,
        deliveryNotes,
      });
      if (!res.success) {
        alert(res.error || 'Could not save delivery preference.');
        return;
      }
      const formattedFullAddress =
        method === 'delivery'
          ? `${deliveryAddress.trim()}, ${deliveryLga.trim()} LGA, ${deliveryState.trim()} State`
          : null;
      setActiveOrder((prev: any) => ({
        ...prev,
        delivery_method: method,
        delivery_state: method === 'delivery' ? deliveryState.trim() : null,
        delivery_lga: method === 'delivery' ? deliveryLga.trim() : null,
        delivery_address: formattedFullAddress,
        delivery_phone: method === 'delivery' ? (deliveryPhone.trim() || prev.customer_phone) : null,
        delivery_alt_phone: method === 'delivery' ? (deliveryAltPhone.trim() || null) : null,
        delivery_notes: method === 'delivery' ? deliveryNotes.trim() : null,
        delivery_requested_at: new Date().toISOString(),
      }));
      if (method === 'pickup') {
        setDeliveryFormOpen(false);
      }
    } finally {
      setSavingDelivery(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && activeOrder?.order_reference) {
      setTrackingUrl(`${window.location.origin}/track?ref=${activeOrder.order_reference}`);
    }
  }, [activeOrder?.order_reference]);

  const steps = [
    { key: 'CUTTING', label: 'Cutting Table', icon: '✂️' },
    { key: 'EMBROIDERY', label: 'Embroidery Unit', icon: '🪡' },
    { key: 'SEWING', label: 'Tailoring & Stitch', icon: '🧵' },
    { key: 'READY FOR PICKUP', label: 'Ready for Pickup', icon: '📦' },
    { key: 'COMPLETED', label: 'Handover Completed', icon: '✨' },
  ];

  const getStepIndex = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    switch (s) {
      case 'NEW':
      case 'CONFIRMED':
      case 'CUTTING':
        return 0;
      case 'EMBROIDERY':
        return 1;
      case 'SEWING':
        return 2;
      case 'READY FOR PICKUP':
      case 'READY':
        return 3;
      case 'COMPLETED':
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStep = activeOrder ? getStepIndex(activeOrder.status) : -1;

  const totalPrice = Number(activeOrder?.total_price) || 0;
  const amountPaid = Number(activeOrder?.amount_paid) || 0;
  const remainingBalance = Math.max(0, totalPrice - amountPaid);
  const isFullyPaid = remainingBalance <= 0 || activeOrder?.payment_status === '100%_FULLY_PAID';

  const copyLink = () => {
    if (trackingUrl) {
      navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCustomDepositDue = activeOrder?.is_custom_design && activeOrder?.status === 'QUOTE_ACCEPTED';
  const modalExpectedAmount = isCustomDepositDue
    ? (customDepositPlan === '50_PERCENT'
        ? Math.round(Number(activeOrder?.total_price || 0) * 0.5)
        : Number(activeOrder?.total_price || 0))
    : remainingBalance;

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const objectUrl = URL.createObjectURL(file);
    setReceiptPreview(objectUrl);
    setVerificationResult(null);

    setScanning(true);
    try {
      const res = await verifyBankReceipt(
        file,
        '8030635560',
        'Abdulrahman Aliyu',
        modalExpectedAmount
      );
      setVerificationResult(res);
    } catch (err: any) {
      console.error('OCR Verification error:', err);
      alert('Failed to read receipt: ' + (err.message || 'Image processing error'));
    } finally {
      setScanning(false);
    }
  };

  const handleCompleteSettlement = async () => {
    if (!receiptFile) {
      alert('Please upload your transfer receipt to proceed.');
      return;
    }
    if (!verificationResult || !verificationResult.isValid) {
      const errList = verificationResult?.errors?.length
        ? verificationResult.errors.join('; ')
        : 'Official transfer receipt verification failed.';
      alert('Cannot proceed: ' + errList);
      return;
    }

    setSettling(true);
    try {
      const formData = new FormData();
      formData.append('orderId', activeOrder.id);
      formData.append('receiptFile', receiptFile);
      formData.append('verificationData', JSON.stringify(verificationResult.extractedData));

      if (isCustomDepositDue) {
        formData.append('depositPlan', customDepositPlan);
        const res = await payAcceptedCustomQuoteAction(formData);
        if (!res.success) {
          alert('Deposit Rejected: ' + res.error);
          setSettling(false);
          return;
        }
        alert('Deposit verified! Your custom design order has entered the workshop floor (Cutting & Prep).');
        window.location.reload();
        return;
      }

      const res = await settleBalanceWithReceiptAction(formData);
      if (!res.success) {
        alert('Settlement Rejected: ' + res.error);
        setSettling(false);
        return;
      }

      alert(
        res.autoCompleted
          ? 'Settlement verified successfully! Your outfit is now COMPLETED and released.'
          : 'Settlement verified successfully! Your payment is confirmed.'
      );
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Network or server error during balance settlement.');
      setSettling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>✨</span> Live Atelier Garment Tracker
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Track Your Bespoke Order</h1>
          <p className="text-sm text-slate-400">
            Real-time workshop floor progress, artisan assignment, and pickup verification.
          </p>
        </div>

        {/* Search Bar */}
        <form method="GET" action="/track" className="relative flex items-center">
          <input
            type="text"
            name="ref"
            defaultValue={rawQuery || ''}
            placeholder="Enter Order Reference (e.g. ORD-OMZ8FRA8) or Phone Number..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-md"
          >
            Track 🔍
          </button>
        </form>

        {searched && !activeOrder && (
          <div className="p-8 text-center rounded-2xl bg-slate-900/80 border border-rose-500/20 text-slate-300">
            <span className="text-3xl mb-2 block">🔍</span>
            <p className="font-bold text-rose-400">No active tailoring order found</p>
            <p className="text-xs text-slate-400 mt-1">Please double check your reference code or phone number.</p>
          </div>
        )}

                  {/* Multiple Orders Selector when searching by Phone */}
          {customerOrders && customerOrders.length > 1 && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Found {customerOrders.length} Orders for this Phone Number
                </span>
                <span className="text-[11px] text-slate-400">Select an order to view</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {customerOrders.map((ord: any) => {
                  const isSelected = activeOrder?.id === ord.id;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => setActiveOrder(ord)}
                      className={
                        isSelected
                          ? "px-3 py-2 rounded-xl text-left border text-xs whitespace-nowrap transition-all bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                          : "px-3 py-2 rounded-xl text-left border text-xs whitespace-nowrap transition-all bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700"
                      }
                    >
                      <div className="font-mono font-bold">{ord.order_reference}</div>
                      <div className="text-[10px] opacity-80 truncate max-w-[140px]">
                        {ord.sewing_style_name_at_order || 'Tailoring'} • {ord.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeOrder && (
          <div className="space-y-6">
            
            {/* Order Identity Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Order Reference</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xl font-black text-amber-400 font-mono">{activeOrder.order_reference}</span>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 border border-slate-700"
                    >
                      {copied ? '✓ Copied' : '🔗 Copy Link'}
                    </button>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Client Name</span>
                  <p className="text-base font-bold text-slate-100 mt-0.5">{activeOrder.customer_name}</p>
                </div>
              </div>

              {/* Garment Cut & Embroidery Previews */}
              {(activeOrder.sewing_style_image_url || activeOrder.design_image_url) && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
                  {activeOrder.sewing_style_image_url && (
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setLightboxImg({ src: activeOrder.sewing_style_image_url, title: activeOrder.sewing_style_name_at_order || 'Sewing Cut' })}
                        className="cursor-pointer relative group rounded-xl overflow-hidden border border-slate-700 w-14 h-14 flex-shrink-0 bg-slate-900"
                      >
                        <img src={activeOrder.sewing_style_image_url} alt="Sewing Cut" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute top-0 left-0 bg-slate-900/90 text-[8px] font-bold text-slate-300 px-1 rounded-br">CUT</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{activeOrder.sewing_style_name_at_order || 'Garment Cut'}</p>
                        <button
                          type="button"
                          onClick={() => setLightboxImg({ src: activeOrder.sewing_style_image_url, title: activeOrder.sewing_style_name_at_order || 'Sewing Cut' })}
                          className="text-[11px] text-amber-400 hover:underline font-semibold"
                        >
                          View cut photo
                        </button>
                      </div>
                    </div>
                  )}

                  {activeOrder.design_image_url && (
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setLightboxImg({ src: activeOrder.design_image_url, title: activeOrder.design_name || activeOrder.design_reference_at_order || 'Design' })}
                        className="cursor-pointer relative group rounded-xl overflow-hidden border border-amber-500/40 w-14 h-14 flex-shrink-0 bg-slate-900"
                      >
                        <img src={activeOrder.design_image_url} alt="Embroidery Design" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        <span className="absolute top-0 left-0 bg-amber-500 text-[8px] font-bold text-slate-950 px-1 rounded-br">ART</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{activeOrder.design_name || activeOrder.design_reference_at_order || 'Embroidery Design'}</p>
                        <button
                          type="button"
                          onClick={() => setLightboxImg({ src: activeOrder.design_image_url, title: activeOrder.design_name || activeOrder.design_reference_at_order || 'Design' })}
                          className="text-[11px] text-amber-400 hover:underline font-semibold"
                        >
                          View embroidery photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Stepper */}
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Workshop Production Pipeline</p>
                
                <div className="relative flex justify-between items-center">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0" />
                  <div
                    className="absolute top-1/2 left-0 h-1 bg-amber-500 -translate-y-1/2 transition-all duration-500 z-0"
                    style={{ width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%` }}
                  />

                  {steps.map((st, idx) => {
                    const isDone = currentStep >= idx;
                    const isCurrent = currentStep === idx;
                    return (
                      <div key={st.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
                            isCurrent
                              ? 'bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-500/20 scale-110 shadow-lg'
                              : isDone
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-slate-500'
                          }`}
                        >
                          {isDone && !isCurrent ? '✓' : st.icon}
                        </div>
                        <span
                          className={`text-[10px] sm:text-xs font-bold mt-2 text-center max-w-[70px] ${
                            isCurrent ? 'text-amber-400' : isDone ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Financial Status & Delivery Gate Notice */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Payment Summary & Release Gate</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Total Bill</p>
                  <p className="text-xl font-black text-white mt-1">₦{totalPrice.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Deposit Settled</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">₦{amountPaid.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-[11px] text-slate-500 uppercase font-bold">Balance Remaining</p>
                  <p className={`text-xl font-black mt-1 ${isFullyPaid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₦{remainingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
              {/* Custom Design Quote & In-App Negotiation Card */}
              {activeOrder.is_custom_design && (activeOrder.status === 'PENDING_QUOTE' || activeOrder.status === 'QUOTE_SENT' || activeOrder.status === 'COUNTER_OFFER' || activeOrder.status === 'QUOTE_ACCEPTED') ? (
                <div className="mt-4 p-5 rounded-2xl bg-slate-950/95 border border-amber-500/40 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        ✨ Bespoke Custom Design • {activeOrder.status.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-black text-white mt-2">
                        {Number(activeOrder.total_price) > 0
                          ? `Atelier Quoted Price: ₦${Number(activeOrder.total_price).toLocaleString()}`
                          : 'Awaiting Master Tailor Price Quote'}
                      </h4>
                    </div>
                    {activeOrder.design_image_url && (
                      <img
                        src={activeOrder.design_image_url}
                        alt="Custom Design"
                        className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 flex-shrink-0"
                      />
                    )}
                  </div>

                  {/* In-App Negotiation Thread */}
                  {Array.isArray(activeOrder.negotiation_thread) && activeOrder.negotiation_thread.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-900 border border-slate-800">
                      {activeOrder.negotiation_thread.map((item: any, i: number) => (
                        <div key={item.id || i} className={`text-xs p-2.5 rounded-lg ${item.sender === 'admin' ? 'bg-emerald-950/50 border border-emerald-500/20 text-emerald-100' : 'bg-slate-800/80 text-slate-200'}`}>
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-0.5">
                            <span className={item.sender === 'admin' ? 'text-emerald-400' : 'text-amber-400'}>
                              {item.sender === 'admin' ? 'Master Tailor' : 'You'}
                            </span>
                            {item.amount ? <span className="font-mono text-white">₦{Number(item.amount).toLocaleString()}</span> : null}
                          </div>
                          {item.message && <p className="m-0 leading-relaxed">{item.message}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Counter-Offer / Message Controls */}
                  {activeOrder.status !== 'QUOTE_ACCEPTED' && (
                    <div className="space-y-2.5 pt-2 border-t border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={counterOfferAmount}
                          onChange={(e) => setCounterOfferAmount(e.target.value)}
                          placeholder="Your Counter-Offer (₦)..."
                          className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={negotiationMsg}
                          onChange={(e) => setNegotiationMsg(e.target.value)}
                          placeholder="Add note or question for tailor..."
                          className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submittingQuoteReply}
                          onClick={async () => {
                            const amt = Number(counterOfferAmount);
                            if (!amt || amt <= 0) {
                              alert('Please enter your counter-offer amount in Naira.');
                              return;
                            }
                            setSubmittingQuoteReply(true);
                            const res = await respondToCustomQuoteAction({
                              orderReference: activeOrder.order_reference,
                              action: 'counter_offer',
                              proposedPrice: amt,
                              message: negotiationMsg,
                            });
                            setSubmittingQuoteReply(false);
                            if (!res.success) {
                              alert(res.error || 'Failed to send counter-offer.');
                            } else {
                              setActiveOrder((prev: any) => ({
                                ...prev,
                                status: 'COUNTER_OFFER',
                                quote_status: 'COUNTER_OFFER',
                                negotiation_thread: [
                                  ...(Array.isArray(prev.negotiation_thread) ? prev.negotiation_thread : []),
                                  { sender: 'customer', action: 'counter_offer', amount: amt, message: negotiationMsg },
                                ],
                              }));
                              setCounterOfferAmount('');
                              setNegotiationMsg('');
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                        >
                          💬 Send Counter-Offer
                        </button>

                        {Number(activeOrder.total_price) > 0 && (
                          <button
                            type="button"
                            disabled={submittingQuoteReply}
                            onClick={async () => {
                              setSubmittingQuoteReply(true);
                              const res = await respondToCustomQuoteAction({
                                orderReference: activeOrder.order_reference,
                                action: 'accept_quote',
                                proposedPrice: Number(activeOrder.total_price),
                                message: `Accepted quote of ₦${Number(activeOrder.total_price).toLocaleString()}.`,
                              });
                              setSubmittingQuoteReply(false);
                              if (!res.success) {
                                alert(res.error || 'Could not accept quote.');
                              } else {
                                setActiveOrder((prev: any) => ({
                                  ...prev,
                                  status: 'QUOTE_ACCEPTED',
                                  quote_status: 'ACCEPTED',
                                }));
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer"
                          >
                            ✓ Accept Quote (₦{Number(activeOrder.total_price).toLocaleString()})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deposit Selection (50% or 100%) Once Quote Accepted */}
                  {activeOrder.status === 'QUOTE_ACCEPTED' && Number(activeOrder.total_price) > 0 && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                      <div className="text-xs font-black text-emerald-300 uppercase">
                        ✓ Quote Accepted — Choose Your Deposit Tier to Start Sewing
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-white">
                        <label className="flex items-center gap-2 cursor-pointer font-bold">
                          <input
                            type="radio"
                            checked={customDepositPlan === '50_PERCENT'}
                            onChange={() => setCustomDepositPlan('50_PERCENT')}
                          />
                          50% Deposit (₦{Math.round(Number(activeOrder.total_price) * 0.5).toLocaleString()})
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold">
                          <input
                            type="radio"
                            checked={customDepositPlan === '100_PERCENT'}
                            onChange={() => setCustomDepositPlan('100_PERCENT')}
                          />
                          100% Full Payment (₦{Number(activeOrder.total_price).toLocaleString()})
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettleModalOpen(true)}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                      >
                        💳 Upload Transfer Receipt (₦{(customDepositPlan === '50_PERCENT' ? Math.round(Number(activeOrder.total_price) * 0.5) : Number(activeOrder.total_price)).toLocaleString()}) →
                      </button>
                    </div>
                  )}
                </div>
              ) : !isFullyPaid ? (
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-emerald-500/10 border border-amber-500/40 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          {currentStep >= 2 ? 'Ready for Pickup Gate — Settle Balance to Unlock' : 'Pre-Pickup Balance Settlement'}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Remaining balance: <strong className="text-amber-300 font-mono font-black text-sm">₦{remainingBalance.toLocaleString()}</strong>. Settle via bank transfer with automated receipt verification between <strong>Tailoring &amp; Stitch</strong> and <strong>Ready for Pickup</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSettleModalOpen(true)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>💳</span> Settle Balance (₦{remainingBalance.toLocaleString()}) Online →
                  </button>
                </div>
              ) : currentStep === 3 ? (
                <div className="mt-4 p-5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        <span>✓</span> 100% Settled &amp; Ready for Pickup — Optional Delivery Request
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Your garment is ready! Request optional doorstep delivery below, or skip this form to collect it from our workshop yourself.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryFormOpen(true)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer border ${
                        deliveryFormOpen || activeOrder.delivery_method === 'delivery'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      🚚 Request Delivery (Optional)
                    </button>
                    <button
                      type="button"
                      disabled={savingDelivery}
                      onClick={() => handleDeliverySubmit('pickup')}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        !deliveryFormOpen && activeOrder.delivery_method !== 'delivery'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      🏪 I Will Pick Up at Shop Myself
                    </button>
                  </div>

                  {deliveryFormOpen && (
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                            State <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={deliveryState}
                            onChange={(e) => setDeliveryState(e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                          >
                            <option value="">-- Select State --</option>
                            {NIGERIAN_STATES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                            LGA (Local Government Area) <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={deliveryLga}
                            onChange={(e) => setDeliveryLga(e.target.value)}
                            placeholder="e.g. Dutse, Tarauni, Sabon Gari..."
                            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                          Street Address &amp; Landmark <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House number, street name, area / nearest landmark..."
                          className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                            Primary Phone Number
                          </label>
                          <input
                            type="tel"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            placeholder="Your primary phone number"
                            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                            In-Case / Alternative Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            value={deliveryAltPhone}
                            onChange={(e) => setDeliveryAltPhone(e.target.value)}
                            placeholder="Backup number in case primary is unreachable"
                            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                          Additional Dispatch Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          placeholder="Preferred delivery time or extra directions..."
                          className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={savingDelivery}
                        onClick={() => handleDeliverySubmit('delivery')}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        {savingDelivery
                          ? 'Saving Delivery Details...'
                          : activeOrder.delivery_method === 'delivery'
                          ? '✓ Update Delivery Details'
                          : 'Confirm Delivery Request →'}
                      </button>
                    </div>
                  )}

                  {activeOrder.delivery_method === 'delivery' && activeOrder.delivery_address && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                      <div><strong>✓ Delivery Requested:</strong> {activeOrder.delivery_address}</div>
                      <div className="text-[11px] text-amber-300/90 font-mono">
                        Primary Tel: {activeOrder.delivery_phone || activeOrder.customer_phone}
                        {activeOrder.delivery_alt_phone ? ` • In-Case Tel: ${activeOrder.delivery_alt_phone}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>✓ This order is 100% fully settled. Financial delivery gates unlocked.</span>
                  {activeOrder.delivery_method === 'delivery' && (
                    <span className="text-amber-300 font-semibold">🚚 Handover Mode: Delivery</span>
                  )}
                </div>
              )}
            </div>

            {/* Workshop Job Specifications */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Garment Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Sewing Style</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{activeOrder.sewing_style_name_at_order || 'Custom Cut'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Embroidery</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{activeOrder.design_name || activeOrder.design_reference_at_order || 'None'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Fabric Source</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{activeOrder.fabric_source || 'Customer Provided'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Due Date</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{activeOrder.target_completion_date ? new Date(activeOrder.target_completion_date).toLocaleDateString() : 'Standard Atelier'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Settlement Modal */}
        {settleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-7 text-slate-100 my-8">
              
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Atelier Settlement Portal</span>
                <h3 className="text-xl font-black text-white">Settle Balance for #{activeOrder?.order_reference}</h3>
                <p className="text-xs text-slate-400">
                  Transfer the exact balance to the atelier account and upload the receipt for automated gate release.
                </p>
              </div>

              {/* Amount Due Callout */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exact Balance Due</span>
                  <div className="text-2xl font-black text-amber-400">₦{modalExpectedAmount.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Order Cut</span>
                  <span className="text-xs font-bold text-slate-200">{order?.sewing_style_name_at_order || 'Custom Cut'}</span>
                </div>
              </div>

              {/* Bank Details */}
              <div className="mt-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Bank:</span>
                  <span className="font-black text-white">OPay</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Account Name:</span>
                  <span className="font-bold text-slate-200">Abdulrahman Aliyu</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-amber-400 text-sm">8030635560</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('8030635560');
                        setAccountCopied(true);
                        setTimeout(() => setAccountCopied(false), 2000);
                      }}
                      className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white transition"
                    >
                      {accountCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Input */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Upload Final Transfer Receipt (Screenshot / Photo) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptChange}
                  className="w-full text-xs text-slate-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer rounded-xl bg-slate-950 border border-slate-800 p-2"
                />
              </div>

              {/* Scanning status */}
              {scanning && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 animate-pulse">
                  <span>🔄</span> Running AI OCR validation (checking session ID, date, account & exact amount)...
                </div>
              )}

              {/* Verification Results */}
              {verificationResult && !scanning && (
                <div
                  className={`mt-4 p-4 rounded-xl text-xs space-y-2 border ${
                    verificationResult.isValid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="font-black flex items-center gap-1.5 text-sm">
                    <span>{verificationResult.isValid ? '✓' : '⚠️'}</span>
                    <span>{verificationResult.isValid ? 'Receipt Verified Successfully!' : 'Verification Flagged Items'}</span>
                  </div>

                  {verificationResult.isValid ? (
                    <div className="space-y-1 text-[11px] text-emerald-200/90 font-mono">
                      <div>• Status: <strong>{verificationResult.extractedData.statusText}</strong></div>
                      <div>• Amount: <strong>₦{verificationResult.extractedData.foundAmount?.toLocaleString()}</strong></div>
                      <div>• Session/Ref: <strong>{verificationResult.extractedData.referenceId}</strong></div>
                      <div>• Date: <strong>{verificationResult.extractedData.dateText || 'Today'}</strong></div>
                    </div>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1 text-[11px]">
                      {verificationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSettlement}
                  disabled={scanning || settling || !verificationResult || !verificationResult.isValid}
                  className={`w-2/3 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    verificationResult?.isValid && !settling && !scanning
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {settling ? 'Settling & Unlocking...' : 'Confirm Balance Settlement →'}
                </button>
              </div>

            </div>
          </div>
        )}

        <ImageLightboxModal
          isOpen={Boolean(lightboxImg)}
          imageSrc={lightboxImg?.src || ''}
          title={lightboxImg?.title || ''}
          onClose={() => setLightboxImg(null)}
        />
      </div>
    </div>
  );
}
