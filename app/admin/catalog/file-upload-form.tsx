'use client';

import React, { useState } from 'react';
import { bulkUploadFilesAction } from './actions';

export default function FileUploadForm() {
  const [selectedCount, setSelectedCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setStatusMessage(null);

    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    const res = await bulkUploadFilesAction(formData);

    setIsUploading(false);

    if (!res.success) {
      setStatusMessage({ text: res.error || 'Upload failed', isError: true });
    } else {
      setStatusMessage({ text: `✓ Successfully uploaded and published ${res.count} design(s)!`, isError: false });
      formEl.reset();
      setSelectedCount(0);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '36px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.5rem' }}>📁</span>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Device Photo Batch Uploader
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Select multiple photos from your device, set one batch price, and let the system number them automatically.
          </span>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            marginBottom: '16px',
            background: statusMessage.isError ? '#fee2e2' : '#dcfce7',
            color: statusMessage.isError ? '#991b1b' : '#14532d',
            border: `1px solid ${statusMessage.isError ? '#fca5a5' : '#86efac'}`,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Category / Group Name
            </label>
            <input
              type="text"
              name="categoryName"
              required
              placeholder="e.g. Morocco, Monogram, Zare"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Code Prefix (Auto-Numbers)
            </label>
            <input
              type="text"
              name="codePrefix"
              required
              placeholder="e.g. MOR, MONO, ZAR"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Flat Price for this Whole Batch (₦)
            </label>
            <input
              type="number"
              name="batchPrice"
              required
              step="500"
              placeholder="e.g. 25000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          <input
            type="file"
            name="imageFiles"
            id="fileInput"
            multiple
            accept="image/*"
            required
            onChange={(e) => setSelectedCount(e.target.files?.length || 0)}
            style={{ display: 'none' }}
          />

          <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📷</div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
              {selectedCount > 0
                ? `✓ ${selectedCount} Photo${selectedCount > 1 ? 's' : ''} Selected from Device`
                : 'Click to Browse Device or Drag & Drop Photos'}
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Supports JPG, PNG, WEBP.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          style={{
            background: isUploading ? '#64748b' : '#0f172a',
            color: '#ffffff',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {isUploading ? '⏳ Uploading Files to Storage...' : '⚡ Upload & Publish Batch to Catalog'}
        </button>
      </form>
    </div>
  );
}