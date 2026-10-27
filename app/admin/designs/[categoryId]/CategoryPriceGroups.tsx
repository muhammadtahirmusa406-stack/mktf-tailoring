'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { createPriceGroup, createPriceGroupDesigns, setPriceGroupCover } from './actions';

type Design = {
  id: string;
  reference_code: string | null;
  name: string;
  description: string | null;
  image_path: string | null;
  display_order: number;
  is_active: boolean;
  price_group_id: string | null;
};
type Style = { id: string; name: string; is_active: boolean };
type PriceGroup = {
  id: string;
  category_id: string;
  sewing_style_id: string;
  price: number | string;
  display_order: number;
  is_active: boolean;
  cover_design_item_id: string | null;
};
type PendingImage = { id: string; file: File; previewUrl: string; error?: string };
type UploadResult = { index: number; id?: string; name?: string; referenceCode?: string; imagePath?: string; error?: string };
type Props = { categoryId: string; categoryName: string; initialDesigns: Design[] };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const imageExtension = (file: File) => file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
const formatPrice = (price: string | number) => `₦${Number(price).toLocaleString('en-NG')}`;

export default function CategoryPriceGroups({ categoryId, categoryName, initialDesigns }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [designs, setDesigns] = useState(initialDesigns);
  const [styles, setStyles] = useState<Style[]>([]);
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [styleId, setStyleId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [price, setPrice] = useState('');
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [coverPendingId, setCoverPendingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uncertainSave, setUncertainSave] = useState(false);
  const [currentFile, setCurrentFile] = useState('');
  const [progress, setProgress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [retryGroup, setRetryGroup] = useState<PriceGroup | null>(null);
  const [retryStyleName, setRetryStyleName] = useState('');
  const pendingRef = useRef<PendingImage[]>([]);

  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => () => pendingRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)), []);

  useEffect(() => {
    let current = true;
    async function loadChoices() {
      const [stylesResult, groupsResult] = await Promise.all([
        supabase.from('sewing_styles').select('id, name, is_active').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('design_price_groups').select('id, category_id, sewing_style_id, price, display_order, is_active, cover_design_item_id')
          .eq('category_id', categoryId).order('display_order', { ascending: true }),
      ]);
      if (!current) return;
      if (stylesResult.error || groupsResult.error) {
        setErrorMessage(`Could not load price groups: ${stylesResult.error?.message ?? groupsResult.error?.message}`);
      } else {
        setStyles((stylesResult.data ?? []) as Style[]);
        setGroups((groupsResult.data ?? []) as PriceGroup[]);
      }
      setIsLoading(false);
    }
    void loadChoices();
    return () => { current = false; };
  }, [categoryId, supabase]);

  const selectedStyle = styles.find((style) => style.id === styleId);
  const shownGroups = groups.filter((group) => group.sewing_style_id === styleId);
  const otherDesigns = designs.filter((design) => !design.price_group_id || !groups.some((group) => group.id === design.price_group_id));
  const groupIdsForSelectedStyle = new Set(shownGroups.map((group) => group.id));
  const visibleImagePaths = designs.filter((design) => !design.price_group_id || groupIdsForSelectedStyle.has(design.price_group_id))
    .map((design) => design.image_path).filter((path): path is string => Boolean(path));
  const visibleImagePathKey = visibleImagePaths.join('\n');

  useEffect(() => {
    let current = true;
    if (!visibleImagePathKey) return () => { current = false; };
    const paths = visibleImagePathKey.split('\n');
    async function signVisibleImages() {
      const { data, error } = await supabase.storage.from('designs').createSignedUrls(paths, 60 * 60);
      if (!current) return;
      if (error) {
        setErrorMessage(`Some displayed pictures could not be loaded: ${error.message}`);
        return;
      }
      const urls: Record<string, string> = {};
      data?.forEach((entry, index) => { if (entry.signedUrl) urls[paths[index]] = entry.signedUrl; });
      setSignedUrls(urls);
    }
    void signVisibleImages();
    return () => { current = false; };
  }, [visibleImagePathKey, supabase]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage('');
    setFeedback('');
    const accepted: PendingImage[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(event.target.files ?? [])) {
      if (!ALLOWED_TYPES.includes(file.type)) rejected.push(`${file.name}: use a JPG, PNG, or WebP image.`);
      else if (file.size > MAX_FILE_SIZE) rejected.push(`${file.name}: image must be 5 MB or smaller.`);
      else accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }
    setPending((current) => [...current, ...accepted]);
    if (!coverPendingId && accepted.length) setCoverPendingId(accepted[0].id);
    if (rejected.length) setErrorMessage(rejected.join(' '));
    event.target.value = '';
  }

  function removePending(image: PendingImage) {
    URL.revokeObjectURL(image.previewUrl);
    const next = pending.filter((item) => item.id !== image.id);
    if (coverPendingId === image.id) setCoverPendingId(next[0]?.id ?? '');
    setPending(next);
  }

  async function submitGroup() {
    if (isSubmitting) return;
    setErrorMessage('');
    setFeedback('');
    if (!retryGroup && (!selectedStyle || !styleId)) return setErrorMessage('Select a sewing style.');
    if (!retryGroup && (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0)) return setErrorMessage('Enter a valid non-negative price.');
    if (!pending.length) return setErrorMessage('Choose at least one picture from your computer.');
    if (pending.length > 100) return setErrorMessage('Upload no more than 100 pictures in one group.');
    setIsSubmitting(true);

    let group = retryGroup;
    let styleName = retryStyleName;
    const storageUploads: Array<{ sourceId: string; imagePath: string; name: string }> = [];
    try {
      if (!group) {
        const created = await createPriceGroup(categoryId, styleId, Number(price));
        group = created.group as PriceGroup;
        styleName = created.styleName;
        setRetryGroup(group);
        setRetryStyleName(styleName);
        setGroups((current) => [...current, group!].sort((a, b) => a.display_order - b.display_order));
      }

      for (let index = 0; index < pending.length; index += 1) {
        const image = pending[index];
        setCurrentFile(image.file.name);
        setProgress(`Uploading picture ${index + 1} of ${pending.length}…`);
        const path = `${categoryId}/${crypto.randomUUID()}/${crypto.randomUUID()}.${imageExtension(image.file)}`;
        const { error } = await supabase.storage.from('designs').upload(path, image.file, {
          cacheControl: '3600', upsert: false, contentType: image.file.type,
        });
        if (error) {
          storageUploads.push({ sourceId: image.id, imagePath: '', name: image.file.name });
          setPending((current) => current.map((item) => item.id === image.id ? { ...item, error: `Upload failed: ${error.message}` } : item));
        } else {
          storageUploads.push({ sourceId: image.id, imagePath: path, name: image.file.name.replace(/\.[^.]+$/, '').trim() });
        }
      }

      const uploaded = storageUploads.filter((item) => item.imagePath);
      let results: UploadResult[] = [];
      if (uploaded.length) {
        setProgress(`Saving ${uploaded.length} design ${uploaded.length === 1 ? 'record' : 'records'}…`);
        try {
          results = await createPriceGroupDesigns(categoryId, styleId, group.id, uploaded.map(({ imagePath, name }) => ({ imagePath, name })));
        } catch (saveError) {
          const imagePaths = uploaded.map((item) => item.imagePath);
          const { data: savedRows, error: verifyError } = await supabase.from('design_items')
            .select('id, name, reference_code, image_path')
            .eq('category_id', categoryId).eq('price_group_id', group.id).in('image_path', imagePaths);
          if (verifyError) {
            const message = saveError instanceof Error ? saveError.message : 'The save response was interrupted.';
            setUncertainSave(true);
            setErrorMessage(`Could not confirm whether every design record was saved (${message}). Keep this page open and contact an admin before retrying; the uploaded files were left untouched.`);
            results = uploaded.map((_, index) => ({ index, error: 'The save result could not be confirmed.' }));
          } else {
            setUncertainSave(false);
            const savedByPath = new Map((savedRows ?? []).map((row) => [row.image_path, row]));
            results = uploaded.map((item, index) => {
              const row = savedByPath.get(item.imagePath);
              return row
                ? { index, id: row.id, name: row.name, referenceCode: row.reference_code ?? undefined, imagePath: item.imagePath }
                : { index, imagePath: item.imagePath, error: saveError instanceof Error ? saveError.message : 'Could not save this design.' };
            });
          }
        }
      }

      const failedStorageIds = new Set(storageUploads.filter((item) => !item.imagePath).map((item) => item.sourceId));
      const failedRecordIndexes = new Set(results.filter((result) => result.error).map((result) => result.index));
      const failedIds = new Set(failedStorageIds);
      for (const index of failedRecordIndexes) failedIds.add(uploaded[index].sourceId);
      const failedPaths = results.filter((result) => result.error && result.imagePath).map((result) => result.imagePath!);
      if (failedPaths.length) {
        const { error } = await supabase.storage.from('designs').remove(failedPaths);
        if (error) setErrorMessage(`Some design records failed and their uploaded images could not be cleaned up: ${error.message}`);
      }

      const successes = results.filter((result): result is UploadResult & { id: string; name: string; imagePath: string } => Boolean(result.id && result.name && result.imagePath));
      const newDesigns: Design[] = successes.map((result, index) => ({
        id: result.id,
        reference_code: result.referenceCode ?? null,
        name: result.name,
        description: null,
        image_path: result.imagePath,
        display_order: designs.length + index,
        is_active: true,
        price_group_id: group!.id,
      }));
      setDesigns((current) => [...current, ...newDesigns]);

      const uploadedCoverIndex = pending.findIndex((image) => image.id === coverPendingId);
      const coverSource = uploadedCoverIndex >= 0 ? storageUploads[uploadedCoverIndex] : undefined;
      const coverResult = coverSource?.imagePath
        ? successes.find((result) => result.imagePath === coverSource.imagePath)
        : undefined;
      const currentCover = group.cover_design_item_id;
      const chosenCover = coverResult ?? (!currentCover && successes.length ? successes[0] : undefined);
      let coverNote = '';
      if (chosenCover) {
        try {
          await setPriceGroupCover(categoryId, group.id, chosenCover.id);
          group = { ...group, cover_design_item_id: chosenCover.id };
          setGroups((current) => current.map((item) => item.id === group!.id ? group! : item));
          if (!coverResult && coverPendingId) coverNote = ' The selected cover could not be uploaded, so the first successfully saved picture was used as the cover.';
        } catch (error) {
          coverNote = ` Cover update failed: ${error instanceof Error ? error.message : 'unknown error'}`;
        }
      }

      setPending((current) => current.filter((image) => failedIds.has(image.id)).map((image) => ({
        ...image,
        error: image.error ?? 'Could not save this picture. You can retry it in this price group.',
      })));
      pending.filter((image) => !failedIds.has(image.id)).forEach((image) => URL.revokeObjectURL(image.previewUrl));
      if (failedIds.size) {
        setFeedback(`${successes.length} picture${successes.length === 1 ? '' : 's'} saved in ${formatPrice(group.price)}. ${failedIds.size} picture${failedIds.size === 1 ? '' : 's'} failed and remain available to retry.${coverNote}`);
      } else {
        setFeedback(`Price group created with ${successes.length} ${successes.length === 1 ? 'picture' : 'pictures'} at ${formatPrice(group.price)}.${coverNote}`);
        setPending([]);
        setRetryGroup(null);
        setRetryStyleName('');
        setPrice('');
        setShowForm(false);
      }
      if (failedIds.size === 0 && successes.length === 0) {
        setFeedback(`Price group ${formatPrice(group.price)} was created, but no pictures were saved. The group has no pictures yet; retry the selected files.${coverNote}`);
        setRetryGroup(group);
        setRetryStyleName(styleName);
        setShowForm(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create this price group. Your selected pictures are still available.');
      if (group && !retryGroup) {
        setRetryGroup(group);
        setRetryStyleName(styleName);
      }
    } finally {
      setCurrentFile('');
      setProgress('');
      setIsSubmitting(false);
    }
  }

  async function changeCover(group: PriceGroup, design: Design) {
    setErrorMessage('');
    setFeedback('');
    try {
      await setPriceGroupCover(categoryId, group.id, design.id);
      setGroups((current) => current.map((item) => item.id === group.id ? { ...item, cover_design_item_id: design.id } : item));
      setFeedback(`${design.reference_code ?? design.name} is now the ${formatPrice(group.price)} cover picture.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not change the cover picture.');
    }
  }

  return (
    <>
      <section style={controlPanel}>
        <div style={controlRow}>
          <label style={labelStyle}>Sewing style
            <select value={styleId} onChange={(event) => setStyleId(event.target.value)} style={inputStyle} disabled={isSubmitting}>
              <option value="">Choose a sewing style</option>
              {styles.map((style) => <option key={style.id} value={style.id}>{style.name}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {styleId && !showForm && <button type="button" style={primaryButton} onClick={() => { setRetryGroup(null); setPrice(''); setPending([]); setCoverPendingId(''); setShowForm(true); setErrorMessage(''); setFeedback(''); }}>+ Add Price Group</button>}
            <Link href={`/admin/designs/${categoryId}/bulk`} style={secondaryLink}>Add ungrouped designs</Link>
          </div>
        </div>
        {!styleId && <p style={{ color: '#666', marginBottom: 0 }}>Choose a sewing style to view its price groups.</p>}
      </section>

      {errorMessage && <p role="alert" style={errorStyle}>{errorMessage}</p>}
      {feedback && <p role="status" style={successStyle}>{feedback}</p>}
      {progress && <p aria-live="polite" style={{ color: '#555' }}>{progress}{currentFile ? ` · ${currentFile}` : ''}</p>}

      {showForm && styleId && <section style={formPanel}>
        <h2 style={{ margin: '0 0 8px' }}>{retryGroup ? `Add pictures to ${formatPrice(retryGroup.price)}` : 'Create Price Group & Upload Pictures'}</h2>
        <p style={{ marginTop: 0, color: '#666' }}>Category: {categoryName} · Sewing style: {retryStyleName || selectedStyle?.name}</p>
        {!retryGroup && <label style={labelStyle}>Price (₦)
          <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} disabled={isSubmitting} style={inputStyle} placeholder="Enter the price for this entire picture group" />
        </label>}
        {retryGroup && <p style={{ fontWeight: 700 }}>Group price: {formatPrice(retryGroup.price)}</p>}
        <label style={{ ...labelStyle, marginTop: 16 }}>Pictures
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={isSubmitting} style={{ width: '100%' }} />
          <span style={{ color: '#666', fontSize: 13, fontWeight: 400 }}>Select multiple JPG, PNG, or WebP pictures. Each image can be up to 5 MB.</span>
        </label>
        <p style={{ margin: '14px 0 8px', fontWeight: 700 }}>Selected pictures ({pending.length}) · Click one to choose the cover</p>
        {pending.length ? <div style={previewGrid}>
          {pending.map((image) => <article key={image.id} style={{ ...previewCard, border: coverPendingId === image.id ? '2px solid #176b4d' : '1px solid #ddd' }}>
            <button type="button" onClick={() => setCoverPendingId(image.id)} disabled={isSubmitting} style={previewButton} aria-label={`Choose ${image.file.name} as cover`}>
              <div style={{ position: 'relative', height: 145, background: '#f3f3f3' }}><Image src={image.previewUrl} alt={`Preview of ${image.file.name}`} fill unoptimized style={{ objectFit: 'cover' }} />{coverPendingId === image.id && <span style={coverBadge}>Cover</span>}</div>
            </button>
            <div style={{ padding: 10 }}><p style={fileName}>{image.file.name}</p>{image.error && <p style={{ color: '#a32121', fontSize: 12 }}>{image.error}</p>}<button type="button" onClick={() => removePending(image)} disabled={isSubmitting} style={removeButton}>Remove</button></div>
          </article>)}
        </div> : <p style={{ color: '#777' }}>No pictures selected yet.</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void submitGroup()} disabled={isSubmitting || uncertainSave || pending.length === 0} style={primaryButton}>{isSubmitting ? 'Working…' : uncertainSave ? 'Save needs confirmation' : retryGroup ? 'Retry Failed Pictures' : 'Create Price Group & Upload'}</button>
          {!retryGroup && <button type="button" onClick={() => { pending.forEach((image) => URL.revokeObjectURL(image.previewUrl)); setShowForm(false); setPending([]); setCoverPendingId(''); }} disabled={isSubmitting} style={secondaryButton}>Cancel</button>}
        </div>
      </section>}

      {isLoading ? <p aria-live="polite">Loading price groups…</p> : styleId && shownGroups.length === 0 ? <p style={{ color: '#666' }}>No price groups for {selectedStyle?.name} yet. Add one and upload its pictures together.</p> : styleId && (
        <section style={groupsGrid}>
          {shownGroups.map((group) => {
            const groupDesigns = designs.filter((design) => design.price_group_id === group.id);
            const groupStyleName = styles.find((style) => style.id === group.sewing_style_id)?.name ?? selectedStyle?.name;
            return <article key={group.id} style={groupCard}>
              <header style={groupHeader}><div><p style={{ margin: 0, color: '#666', fontSize: 13 }}>{groupStyleName} · Display order {group.display_order}</p><h2 style={{ margin: '4px 0 0', fontSize: 24 }}>{formatPrice(group.price)}</h2></div><span style={statusStyle(group.is_active)}>{group.is_active ? 'Active' : 'Inactive'}</span></header>
              <div style={groupImages}>
                {groupDesigns.map((design) => <div key={design.id} style={{ ...groupImageCard, outline: group.cover_design_item_id === design.id ? '3px solid #176b4d' : 'none' }}>
                  <div style={{ position: 'relative', height: 138, background: '#f3f3f3' }}>{design.image_path && signedUrls[design.image_path] ? <Image src={signedUrls[design.image_path]} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#777', fontSize: 13 }}>{design.image_path ? 'Loading image…' : 'No image'}</div>}{group.cover_design_item_id === design.id && <span style={coverBadge}>Cover</span>}</div>
                  <div style={{ padding: 8 }}><strong>{design.reference_code ?? design.name}</strong><button type="button" disabled={group.cover_design_item_id === design.id} onClick={() => void changeCover(group, design)} style={coverAction}>{group.cover_design_item_id === design.id ? 'Current cover' : 'Make cover'}</button><Link href={`/admin/designs/${categoryId}/${design.id}/edit`} style={editLink}>Edit design</Link></div>
                </div>)}
                {groupDesigns.length === 0 && <p style={{ color: '#a32121' }}>This price group has no saved pictures. Add pictures before using it.</p>}
              </div>
            </article>;
          })}
        </section>
      )}

      {otherDesigns.length > 0 && <section style={{ marginTop: 34 }}>
        <h2>Ungrouped designs ({otherDesigns.length})</h2>
        <p style={{ color: '#666' }}>These existing designs remain unchanged and are not included in a price group.</p>
        <div style={groupImages}>{otherDesigns.map((design) => <article key={design.id} style={groupImageCard}>
          <div style={{ position: 'relative', height: 150, background: '#f3f3f3' }}>{design.image_path && signedUrls[design.image_path] ? <Image src={signedUrls[design.image_path]} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} /> : <span style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#777' }}>{design.image_path ? 'Loading image…' : 'No image'}</span>}</div>
          <div style={{ padding: 10 }}><strong>{design.reference_code ?? design.name}</strong><p style={{ margin: '4px 0', color: '#555' }}>{design.name}</p><Link href={`/admin/designs/${categoryId}/${design.id}/edit`} style={editLink}>Edit design</Link></div>
        </article>)}</div>
      </section>}
    </>
  );
}

const controlPanel = { display: 'grid', gap: 12, padding: 18, border: '1px solid #ddd', borderRadius: 14, background: '#fff', margin: '20px 0' } as const;
const controlRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap' as const, gap: 14 };
const formPanel = { margin: '20px 0', padding: 20, border: '1px solid #cbd8d1', borderRadius: 14, background: '#fbfdfb' } as const;
const labelStyle = { display: 'grid', gap: 7, fontWeight: 600 } as const;
const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: 11, border: '1px solid #ccc', borderRadius: 8, background: '#fff' } as const;
const primaryButton = { display: 'inline-block', padding: '11px 15px', border: 0, borderRadius: 8, background: '#111', color: '#fff', textDecoration: 'none', fontWeight: 600, cursor: 'pointer' } as const;
const secondaryButton = { padding: '10px 14px', border: '1px solid #bbb', borderRadius: 8, background: '#fff', color: '#111', fontWeight: 600, cursor: 'pointer' } as const;
const secondaryLink = { ...secondaryButton, display: 'inline-block', textDecoration: 'none' } as const;
const previewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 } as const;
const previewCard = { overflow: 'hidden', borderRadius: 10, background: '#fff' } as const;
const previewButton = { width: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' } as const;
const coverBadge = { position: 'absolute', top: 8, left: 8, padding: '4px 8px', borderRadius: 20, background: '#176b4d', color: '#fff', fontSize: 12, fontWeight: 700 } as const;
const fileName = { margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontSize: 13, fontWeight: 600 } as const;
const removeButton = { marginTop: 8, padding: '6px 9px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' } as const;
const groupsGrid = { display: 'grid', gap: 18, marginTop: 22 } as const;
const groupCard = { padding: 18, border: '1px solid #ddd', borderRadius: 14, background: '#fff' } as const;
const groupHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 } as const;
const groupImages = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 } as const;
const groupImageCard = { overflow: 'hidden', border: '1px solid #ddd', borderRadius: 9, background: '#fff', position: 'relative' as const } as const;
const coverAction = { display: 'block', width: '100%', marginTop: 7, padding: 6, border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12 } as const;
const editLink = { display: 'block', marginTop: 7, textAlign: 'center' as const, color: '#111', fontSize: 13 } as const;
const errorStyle = { padding: 12, borderRadius: 8, color: '#8f1d1d', background: '#fff0f0' } as const;
const successStyle = { padding: 12, borderRadius: 8, color: '#176b17', background: '#eaf7ea' } as const;
const statusStyle = (active: boolean) => ({ padding: '5px 9px', borderRadius: 20, background: active ? '#eaf7ea' : '#eee', color: active ? '#176b17' : '#666', fontSize: 12, whiteSpace: 'nowrap' as const });
