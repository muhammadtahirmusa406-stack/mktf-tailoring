'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidMeasurementValue, type MeasurementField } from './measurement-values';

type Props = {
  measurements: MeasurementField[];
  initialValues: Record<string, string>;
};

export default function MeasurementStep({ measurements, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [isContinuing, setIsContinuing] = useState(false);
  const complete = measurements.length > 0 && measurements.every((item) => isValidMeasurementValue(values[item.key] ?? ''));

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
    <section aria-labelledby="measurements-heading" style={{ padding: 20, border: '1px solid #dfe7e2', borderRadius: 14, background: '#fff' }}>
      <div style={{ marginBottom: 18 }}>
        <h2 id="measurements-heading" style={{ margin: '4px 0 6px', fontSize: 23 }}>Your Measurements</h2>
        <p style={{ margin: 0, color: '#666' }}>Select the measurement values you were given.</p>
      </div>

      {measurements.length === 0 ? (
        <p role="alert" style={errorStyle}>Measurements are not available for this sewing style right now.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
          {measurements.map((measurement) => (
            <label key={measurement.key} style={{ display: 'grid', gap: 7, padding: 14, border: '1px solid #e5e8e6', borderRadius: 10, background: '#fafbfa' }}>
              <span style={{ fontWeight: 650, color: '#242424' }}>{measurement.label}</span>
              <span style={{ position: 'relative' }}>
                <select
                  value={values[measurement.key] ?? ''}
                  onChange={(event) => {
                    setIsContinuing(false);
                    setValues((current) => ({ ...current, [measurement.key]: event.target.value }));
                  }}
                  style={selectStyle}
                >
                  <option value="">Select a value</option>
                  {Array.from({ length: 120 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <span aria-hidden="true" style={arrowStyle}>⌄</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <button type="button" onClick={continueToNextStep} disabled={!complete || isContinuing} style={{ ...continueButtonStyle, ...(complete && !isContinuing ? {} : disabledButtonStyle) }}>
        {isContinuing ? 'Opening review…' : 'Review order'}
      </button>

      {!complete && measurements.length > 0 && <p style={{ margin: '10px 0 0', color: '#666', fontSize: 13 }}>Select a value for every measurement to continue.</p>}
    </section>
  );
}

const selectStyle = { width: '100%', minHeight: 48, appearance: 'none' as const, padding: '11px 42px 11px 12px', border: '1px solid #c9d0cc', borderRadius: 8, background: '#fff', color: '#222', fontSize: 16, cursor: 'pointer' } as const;
const arrowStyle = { position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-55%)', color: '#444', fontSize: 23, pointerEvents: 'none' as const };
const continueButtonStyle = { width: '100%', marginTop: 22, padding: 14, border: 0, borderRadius: 9, background: '#176b4d', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' } as const;
const disabledButtonStyle = { background: '#aaa', cursor: 'not-allowed' } as const;
const errorStyle = { margin: 0, padding: 14, border: '1px solid #efc8c8', borderRadius: 10, background: '#fff4f4', color: '#a32121' } as const;
