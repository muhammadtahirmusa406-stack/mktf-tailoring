'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Product = {
  id: string;
  code: string;
  name: string;
  type: string | null;
  description: string | null;
  price: number;
  is_active: boolean;
};

type FabricOption = {
  id: string;
  reference_code: string;
  display_name: string | null;
  display_order: number;
  is_active: boolean;
};

type Props = { product: Product; options: FabricOption[] };
const codePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const inputStyle = { width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8 };

export default function EditProductForm({ product, options }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState(product.code);
  const [name, setName] = useState(product.name);
  const [type, setType] = useState(product.type ?? '');
  const [price, setPrice] = useState(String(product.price));
  const [description, setDescription] = useState(product.description ?? '');
  const [isActive, setIsActive] = useState(product.is_active);
  const [newReferences, setNewReferences] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingOption, setIsUpdatingOption] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function parseNewReferences() {
    const seen = new Set<string>();
    return newReferences.split(/\r?\n/).map((line) => line.trim().toUpperCase()).filter((reference) => {
      if (!reference || seen.has(reference)) return false;
      seen.add(reference);
      return true;
    });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const normalizedCode = code.trim().toUpperCase();
    const numericPrice = Number(price);

    if (!codePattern.test(normalizedCode)) {
      setErrorMessage('Use letters and numbers separated by single hyphens for the product code (for example, ML-042).');
      return;
    }
    if (!name.trim() || !type.trim()) {
      setErrorMessage('Product name and fabric type are required.');
      return;
    }
    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setErrorMessage('Please enter a valid non-negative price.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: duplicate, error: duplicateError } = await supabase
        .from('fabric_products').select('id').eq('code', normalizedCode).neq('id', product.id).maybeSingle();
      if (duplicateError) throw new Error(`Could not check product code: ${duplicateError.message}`);
      if (duplicate) throw new Error('That product code is already in use.');

      const { error } = await supabase.from('fabric_products').update({
        code: normalizedCode,
        name: name.trim(),
        type: type.trim(),
        price: numericPrice,
        description: description.trim() || null,
        is_active: isActive,
      }).eq('id', product.id);
      if (error) throw new Error(error.message);

      setSuccessMessage('Product saved successfully.');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save product changes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addReferences() {
    setErrorMessage('');
    setSuccessMessage('');
    const references = parseNewReferences();
    if (references.length === 0) {
      setErrorMessage('Enter at least one new reference code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: duplicates, error: referenceError } = await supabase
        .from('fabric_options').select('reference_code').in('reference_code', references);
      if (referenceError) throw new Error(`Could not check reference codes: ${referenceError.message}`);
      if (duplicates?.length) throw new Error(`Reference code already exists: ${duplicates[0].reference_code}`);
      const nextOrder = Math.max(-1, ...options.map((option) => option.display_order)) + 1;
      const { error: insertError } = await supabase.from('fabric_options').insert(references.map((reference_code, index) => ({
        fabric_product_id: product.id,
        reference_code,
        display_name: reference_code,
        display_order: nextOrder + index,
        is_active: true,
      })));
      if (insertError) throw new Error(insertError.message);
      setNewReferences('');
      setSuccessMessage(`${references.length} reference${references.length === 1 ? '' : 's'} added.`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not add references.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function setOptionActive(option: FabricOption, active: boolean) {
    setErrorMessage('');
    setSuccessMessage('');
    setIsUpdatingOption(option.id);
    const { error } = await supabase.from('fabric_options').update({ is_active: active }).eq('id', option.id);
    if (error) setErrorMessage(`Could not update ${option.reference_code}: ${error.message}`);
    else {
      setSuccessMessage(`${option.reference_code} ${active ? 'activated' : 'deactivated'}.`);
      router.refresh();
    }
    setIsUpdatingOption(null);
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <form onSubmit={saveProduct} style={{ display: 'grid', gap: 16, padding: 24, border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Product Code</div><input value={code} onChange={(event) => setCode(event.target.value)} disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Product Name</div><input value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Fabric Type</div><input value={type} onChange={(event) => setType(event.target.value)} disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Common Price</div><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Description</div><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} disabled={isSubmitting} style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={isSubmitting} /> Product is active</label>
        <button type="submit" disabled={isSubmitting} style={{ padding: 13, border: 0, borderRadius: 8, background: '#111', color: '#fff', fontWeight: 600 }}>{isSubmitting ? 'Saving...' : 'Save Product'}</button>
      </form>

      <section style={{ padding: 24, border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>WhatsApp Picture References</h2>
        <p style={{ color: '#666' }}>Inactive references are retained for historical order records and can be reactivated.</p>
        {options.length === 0 ? <p>No references have been added yet.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {options.map((option) => (
              <li key={option.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #eee', borderRadius: 8, flexWrap: 'wrap' }}>
                <div><strong>{option.reference_code}</strong>{option.display_name && option.display_name !== option.reference_code ? <span> — {option.display_name}</span> : null}<div style={{ color: '#666', fontSize: 13 }}>{option.is_active ? 'Active' : 'Inactive'}</div></div>
                <button type="button" onClick={() => setOptionActive(option, !option.is_active)} disabled={isUpdatingOption === option.id} style={{ padding: '8px 12px' }}>{isUpdatingOption === option.id ? 'Updating...' : option.is_active ? 'Deactivate' : 'Reactivate'}</button>
              </li>
            ))}
          </ul>
        )}
        <label style={{ display: 'block', marginTop: 22 }}><div style={{ fontWeight: 600, marginBottom: 6 }}>Add new references</div><textarea value={newReferences} onChange={(event) => setNewReferences(event.target.value)} rows={5} placeholder={'ML-042-E\nML-042-F'} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} /><span style={{ display: 'block', marginTop: 6, color: '#666', fontSize: 14 }}>Enter one reference code per line. Blank lines and duplicate lines are ignored.</span></label>
        <button type="button" disabled={isSubmitting || parseNewReferences().length === 0} onClick={() => void addReferences()} style={{ marginTop: 12, padding: '11px 16px' }}>
          Add References
        </button>
      </section>

      {(errorMessage || successMessage) && (
        <div role={errorMessage ? 'alert' : 'status'} style={{ padding: 12, borderRadius: 8, background: errorMessage ? '#ffecec' : '#eaf7ea', color: errorMessage ? '#b00020' : '#176b17' }}>
          {errorMessage || successMessage}
        </div>
      )}
    </div>
  );
}
