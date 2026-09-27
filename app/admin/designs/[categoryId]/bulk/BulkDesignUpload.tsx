'use client';

import Image from 'next/image';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createDesignWithReference } from '../../designReferences';

type PendingImage = { id: string; file: File; previewUrl: string; error?: string };
type RejectedImage = { id: string; name: string; reason: string };
type UploadedDesign = { name: string; referenceCode: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function extensionFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export default function BulkDesignUpload({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [rejected, setRejected] = useState<RejectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const [runUploaded, setRunUploaded] = useState(0);
  const [totalUploaded, setTotalUploaded] = useState(0);
  const [uploadedDesigns, setUploadedDesigns] = useState<UploadedDesign[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState('');
  const pendingRef = useRef<PendingImage[]>([]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => () => {
    pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage('');
    setSummary('');
    const files = Array.from(event.target.files ?? []);
    const accepted: PendingImage[] = [];
    const rejectedFiles: RejectedImage[] = [];

    for (const file of files) {
      let reason = '';
      if (!allowedTypes.includes(file.type)) reason = 'Use a JPG, PNG, or WebP image.';
      else if (file.size > MAX_FILE_SIZE) reason = 'Image must be 5 MB or smaller.';

      if (reason) {
        rejectedFiles.push({ id: crypto.randomUUID(), name: file.name, reason });
      } else {
        accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
      }
    }

    setPending((current) => [...current, ...accepted]);
    setRejected((current) => [...current, ...rejectedFiles]);
    event.target.value = '';
  }

  function removePendingImage(image: PendingImage) {
    URL.revokeObjectURL(image.previewUrl);
    setPending((current) => current.filter((item) => item.id !== image.id));
  }

  async function verifyAdmin() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Please sign in again to manage designs.');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError || profile?.role !== 'admin') throw new Error('Only an admin can manage designs.');
  }

  async function uploadAll() {
    if (!pending.length || isUploading) return;
    setErrorMessage('');
    setSummary('');
    setIsUploading(true);
    setProcessedCount(0);
    setRunUploaded(0);
    setRunTotal(pending.length);
    setCurrentFile('');
    setPending((current) => current.map((item) => ({ ...item, error: undefined })));

    let uploadedThisRun = 0;
    let processedThisRun = 0;
    let existingCount = 0;
    let nextDisplayOrder = 0;

    try {
      await verifyAdmin();

      const { count, error: countError } = await supabase.from('design_items')
        .select('id', { count: 'exact', head: true }).eq('category_id', categoryId);
      if (countError) throw new Error(`Could not prepare the design sequence: ${countError.message}`);
      existingCount = count ?? 0;

      const { data: lastDesign, error: orderError } = await supabase.from('design_items')
        .select('display_order').eq('category_id', categoryId)
        .order('display_order', { ascending: false }).limit(1).maybeSingle();
      if (orderError) throw new Error(`Could not prepare the display order: ${orderError.message}`);
      nextDisplayOrder = (lastDesign?.display_order ?? -1) + 1;

      const batch = [...pending];
      for (const item of batch) {
        processedThisRun += 1;
        setCurrentFile(item.file.name);
        setProcessedCount(processedThisRun - 1);
        const itemId = crypto.randomUUID();
        const storagePath = `${categoryId}/${itemId}/${crypto.randomUUID()}.${extensionFor(item.file.type)}`;
        let imageUploaded = false;
        let failure = '';

        const { error: uploadError } = await supabase.storage.from('designs').upload(storagePath, item.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: item.file.type,
        });

        if (uploadError) {
          failure = `Image upload failed: ${uploadError.message}`;
        } else {
          imageUploaded = true;
          const sequence = String(existingCount + uploadedThisRun + 1).padStart(2, '0');
          const designName = `${categoryName} ${sequence}`;
          try {
            const referenceCode = await createDesignWithReference(supabase, {
            id: itemId,
              categoryId,
              categoryName,
              name: designName,
              description: null,
              imagePath: storagePath,
              displayOrder: nextDisplayOrder + uploadedThisRun,
            });
            setUploadedDesigns((current) => [{ name: designName, referenceCode }, ...current]);
          } catch (insertError) {
            failure = insertError instanceof Error ? insertError.message : 'Could not save design record.';
            const { error: cleanupError } = await supabase.storage.from('designs').remove([storagePath]);
            if (cleanupError) failure += ` Uploaded file cleanup failed: ${cleanupError.message}`;
            imageUploaded = false;
          }
        }

        if (imageUploaded) {
          uploadedThisRun += 1;
          URL.revokeObjectURL(item.previewUrl);
          setPending((current) => current.filter((entry) => entry.id !== item.id));
          setRunUploaded(uploadedThisRun);
        } else {
          setPending((current) => current.map((entry) => entry.id === item.id ? { ...entry, error: failure } : entry));
        }

        setProcessedCount(processedThisRun);
      }

      setTotalUploaded((current) => current + uploadedThisRun);
      const failed = batch.length - uploadedThisRun;
      setSummary(failed === 0
        ? `All ${uploadedThisRun} ${uploadedThisRun === 1 ? 'design was' : 'designs were'} uploaded successfully.`
        : `Uploaded ${uploadedThisRun} of ${batch.length} designs. ${failed} ${failed === 1 ? 'image remains' : 'images remain'} below and can be retried.`);
      if (uploadedThisRun > 0) router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not start the upload. Your selected images are still here.');
    } finally {
      setCurrentFile('');
      setIsUploading(false);
    }
  }

  const progress = runTotal ? Math.round((processedCount / runTotal) * 100) : 0;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ padding: 20, border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Choose design images</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} disabled={isUploading} style={{ width: '100%' }} />
          <span style={{ display: 'block', marginTop: 8, color: '#666', fontSize: 14 }}>Select multiple JPG, PNG, or WebP images. Each image can be up to 5 MB.</span>
        </label>
      </section>

      {rejected.length > 0 && (
        <section role="alert" style={{ padding: 16, border: '1px solid #f0caca', borderRadius: 12, background: '#fff7f7', color: '#8b1d1d' }}>
          <strong>Some files were not added</strong>
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>{rejected.map((item) => <li key={item.id}>{item.name}: {item.reason}</li>)}</ul>
        </section>
      )}

      {pending.length > 0 ? (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Ready to upload ({pending.length})</h2>
            <span style={{ color: '#666', fontSize: 14 }}>Names will follow {categoryName} 01, {categoryName} 02, and so on.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {pending.map((item) => (
              <article key={item.id} style={{ overflow: 'hidden', border: `1px solid ${item.error ? '#e5aaaa' : '#ddd'}`, borderRadius: 12, background: '#fff' }}>
                <div style={{ position: 'relative', height: 170, background: '#f3f3f3' }}><Image src={item.previewUrl} alt={`Preview of ${item.file.name}`} fill unoptimized style={{ objectFit: 'cover' }} /></div>
                <div style={{ padding: 12 }}>
                  <p title={item.file.name} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600 }}>{item.file.name}</p>
                  <p style={{ margin: '4px 0 0', color: '#777', fontSize: 12 }}>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  {item.error && <p style={{ margin: '8px 0 0', color: '#a32121', fontSize: 13 }}>{item.error}</p>}
                  <button type="button" onClick={() => removePendingImage(item)} disabled={isUploading} style={{ width: '100%', marginTop: 10, padding: 8, border: '1px solid #ccc', borderRadius: 7, background: '#fff' }}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ padding: 30, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 14, color: '#666' }}>No images selected yet. Choose one or more images above to preview them here.</section>
      )}

      {isUploading && (
        <section aria-live="polite" style={{ padding: 18, border: '1px solid #ddd', borderRadius: 12, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}><strong>Uploading designs</strong><strong>{progress}%</strong></div>
          <div style={{ height: 10, overflow: 'hidden', borderRadius: 20, background: '#e5e5e5' }}><div style={{ width: `${progress}%`, height: '100%', background: '#176b4d', transition: 'width 0.2s ease' }} /></div>
          <p style={{ margin: '10px 0 0', color: '#666', fontSize: 14 }}>{processedCount} of {runTotal} processed · {runUploaded} uploaded{currentFile ? ` · ${currentFile}` : ''}</p>
        </section>
      )}

      {errorMessage && <p role="alert" style={{ margin: 0, padding: 12, borderRadius: 8, background: '#ffecec', color: '#a32121' }}>{errorMessage}</p>}
      {summary && <p role="status" style={{ margin: 0, padding: 12, borderRadius: 8, background: '#eaf7ea', color: '#176b17' }}>{summary}{totalUploaded > 0 ? ` Total uploaded this session: ${totalUploaded}.` : ''}</p>}

      {uploadedDesigns.length > 0 && (
        <section aria-live="polite" style={{ padding: 18, border: '1px solid #cde5d6', borderRadius: 12, background: '#f4fbf6' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 18 }}>Uploaded design references</h2>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, margin: 0, paddingLeft: 20 }}>
            {uploadedDesigns.map((design, index) => <li key={`${design.referenceCode}-${index}`}><strong>{design.referenceCode}</strong> — {design.name}</li>)}
          </ul>
        </section>
      )}

      <button type="button" onClick={() => void uploadAll()} disabled={isUploading || pending.length === 0} style={{ width: '100%', padding: 15, border: 0, borderRadius: 9, background: isUploading || pending.length === 0 ? '#999' : '#111', color: '#fff', fontSize: 16, fontWeight: 700, cursor: isUploading || pending.length === 0 ? 'not-allowed' : 'pointer' }}>
        {isUploading ? 'Uploading...' : totalUploaded > 0 ? 'Retry / Upload Remaining Designs' : 'Upload Designs'}
      </button>
    </div>
  );
}
