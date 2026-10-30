'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidMeasurementValue, type MeasurementField } from './measurement-values';
import { lookupCustomerByPhoneAction } from './lookup-action';

type Props = {
  measurements: MeasurementField[];
  initialValues: Record<string, string>;
};

export default function MeasurementStep({ measurements, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [isContinuing, setIsContinuing] = useState(false);

  // Returning customer phone lookup state
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [returningUser, setReturningUser] = useState<{
    customerName: string;
    previousRef: string;
  } | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const complete =
    measurements.length > 0 &&
    measurements.every((item) => isValidMeasurementValue(values[item.key] ?? ''));

  async function handlePhoneLookup() {
    const cleanPhone = phoneQuery.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setLookupMessage('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    setSearchingPhone(true);
    setLookupMessage(null);

    try {
      const res = await lookupCustomerByPhoneAction(cleanPhone);
      if (res.success && res.found) {
        setReturningUser({
          customerName: res.customerName,
          previousRef: res.previousRef,
        });

        // Pre-fill measurements that match our field keys
        if (res.measurements && typeof res.measurements === 'object') {
          setValues((current) => {
            const updated = { ...current };
            for (const item of measurements) {
              if (res.measurements[item.key] !== undefined) {
                updated[item.key] = String(res.measurements[item.key]);
              }
            }
            return updated;
          });
        }
      } else {
        setReturningUser(null);
        setLookupMessage('No previous measurements found for this phone number. Please choose your values manually below.');
      }
    } catch {
      setLookupMessage('Error checking phone records. Please select values below.');
    } finally {
      setSearchingPhone(false);
    }
  }

  function continueToNextStep() {
    if (!complete) return;

    const storedValues = Object.fromEntries(
      measurements.map((item) => [item.key, Number(values[item.key])])
    );
    const url = new URL(window.location.href);
    url.searchParams.set('measurements', JSON.stringify(storedValues));
    url.searchParams.set('step', 'review');
    setIsContinuing(true);
    router.push(`${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <section aria-labelledby="measurements-heading" className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 font-sans space-y-6">
      
      {/* Step Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <span>●</span> Step 2 of 3: Tailoring Dimensions
        </div>
        <h2 id="measurements-heading" className="text-2xl font-extrabold text-white">Your Body Measurements</h2>
        <p className="text-xs text-slate-400 mt-1">Select whole-number values (in inches) for each dimension.</p>
      </div>

      {/* Returning Customer Quick-Lookup Box */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="customer-phone" className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <span>✨</span> Returning Customer? Auto-Fill Your Measurements
          </label>
        </div>
        <div className="flex gap-2">
          <input
            id="customer-phone"
            type="tel"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePhoneLookup(); } }}
            placeholder="Enter your phone number (e.g., 08031234567)..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handlePhoneLookup}
            disabled={searchingPhone}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm whitespace-nowrap"
          >
            {searchingPhone ? 'Checking...' : 'Find My Sizes 🔍'}
          </button>
        </div>

        {/* Welcome Back Banner */}
        {returningUser && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <span className="text-xl">🧵</span>
            <div>
              <p className="text-xs font-bold text-emerald-400">
                Welcome back, {returningUser.customerName}!
              </p>
              <p className="text-[11px] text-emerald-300/90 mt-0.5">
                We loaded your saved tailoring sizes from order <span className="font-mono font-bold">{returningUser.previousRef}</span>. You can review and adjust any field below if you desire a looser or tighter fit.
              </p>
            </div>
          </div>
        )}

        {/* Fallback Message */}
        {lookupMessage && !returningUser && (
          <p className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
            ℹ️ {lookupMessage}
          </p>
        )}
      </div>

      {/* Measurement Dropdown Selectors */}
      {measurements.length === 0 ? (
        <p role="alert" className="text-xs text-rose-400 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          Measurements are not available for this sewing style right now.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {measurements.map((measurement) => (
            <label
              key={measurement.key}
              className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2"
            >
              <span className="text-xs font-bold text-slate-200">
                {measurement.label}
              </span>
              <div className="relative">
                <select
                  value={values[measurement.key] ?? ''}
                  onChange={(event) => {
                    setIsContinuing(false);
                    setValues((current) => ({ ...current, [measurement.key]: event.target.value }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 appearance-none"
                >
                  <option value="" disabled className="text-slate-500">
                    Select a value
                  </option>
                  {Array.from({ length: 120 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={String(num)} className="bg-slate-900 text-slate-100">
                      {num}&quot;
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                  ▼
                </span>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
        >
          ← Previous Step
        </button>

        <button
          type="button"
          onClick={continueToNextStep}
          disabled={!complete || isContinuing}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold transition shadow-lg shadow-amber-500/20"
        >
          {isContinuing ? 'Saving...' : 'Review Order Summary →'}
        </button>
      </div>

    </section>
  );
}
