'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const codePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function parseReferences(value: string) {
  const references: string[] = [];
  const seen = new Set<string>();
  for (const line of value.split(/\r?\n/)) {
    const reference = line.trim().toUpperCase();
    if (reference && !seen.has(reference)) {
      seen.add(reference);
      references.push(reference);
    }
  }
  return references;
}

export default function AddProductForm() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [referencesText, setReferencesText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const productCode = code.trim().toUpperCase();
    const productName = name.trim();
    const productType = type.trim();
    const numericPrice = Number(price);
    const references = parseReferences(referencesText);

    if (!codePattern.test(productCode)) {
      setErrorMessage('Use letters and numbers separated by single hyphens for the product code (for example, ML-042).');
      return;
    }
    if (!productName) {
      setErrorMessage('Please enter the product name.');
      return;
    }
    if (!productType) {
      setErrorMessage('Please enter the fabric type.');
      return;
    }
    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setErrorMessage('Please enter a valid non-negative price.');
      return;
    }
    if (references.length === 0) {
      setErrorMessage('Enter at least one WhatsApp picture reference.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingProduct, error: codeLookupError } = await supabase
        .from('fabric_products').select('id').eq('code', productCode).maybeSingle();
      if (codeLookupError) throw new Error(`Could not check product code: ${codeLookupError.message}`);
      if (existingProduct) throw new Error('That product code is already in use.');

      const { data: existingOptions, error: referenceLookupError } = await supabase
        .from('fabric_options').select('reference_code').in('reference_code', references);
      if (referenceLookupError) throw new Error(`Could not check reference codes: ${referenceLookupError.message}`);
      if (existingOptions?.length) {
        throw new Error(`Reference code already in use: ${existingOptions[0].reference_code}`);
      }

      const { data: product, error: productError } = await supabase
        .from('fabric_products')
        .insert({ code: productCode, name: productName, type: productType, price: numericPrice, description: description.trim() || null, is_active: true })
        .select('id').single();
      if (productError || !product) throw new Error(productError?.message ?? 'Could not create the fabric product.');

      const { error: optionsError } = await supabase.from('fabric_options').insert(
        references.map((reference_code, display_order) => ({
          fabric_product_id: product.id,
          reference_code,
          display_name: reference_code,
          display_order,
          is_active: true,
        }))
      );

      if (optionsError) {
        const { error: rollbackError } = await supabase.from('fabric_products').delete().eq('id', product.id);
        const rollbackNote = rollbackError ? ` The product row could not be rolled back: ${rollbackError.message}` : '';
        throw new Error(`Could not save WhatsApp references: ${optionsError.message}.${rollbackNote}`);
      }

      setSuccessMessage('Fabric product and WhatsApp references added. Opening the catalogue...');
      setTimeout(() => {
        router.push('/admin/catalogue/products');
        router.refresh();
      }, 700);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong while adding the product.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle = { width: '100%', padding: 12, border: '1px solid #ccc', borderRadius: 8 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: 18, padding: 24, border: '1px solid #ddd', borderRadius: 14, background: '#fff' }}>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Product Code</div><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. ML-042" disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Product Name</div><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Men Lace" disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Fabric Type</div><input value={type} onChange={(event) => setType(event.target.value)} placeholder="e.g. Lace" disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Common Price</div><input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 50000" disabled={isSubmitting} style={inputStyle} required /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>Description <span style={{ color: '#777' }}>(optional)</span></div><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Describe the fabric or product..." disabled={isSubmitting} style={{ ...inputStyle, resize: 'vertical' }} /></label>
        <label><div style={{ fontWeight: 600, marginBottom: 6 }}>WhatsApp Picture References</div><textarea value={referencesText} onChange={(event) => setReferencesText(event.target.value)} rows={8} placeholder={'ML-042-A\nML-042-B\nML-042-C\nML-042-D'} disabled={isSubmitting} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }} required /><span style={{ display: 'block', marginTop: 6, color: '#666', fontSize: 14 }}>Enter one reference code per line. Example: ML-042-A</span></label>
        {errorMessage && <div role="alert" style={{ padding: 12, borderRadius: 8, background: '#ffecec', color: '#b00020' }}>{errorMessage}</div>}
        {successMessage && <div role="status" style={{ padding: 12, borderRadius: 8, background: '#eaf7ea', color: '#176b17' }}>{successMessage}</div>}
        <button type="submit" disabled={isSubmitting} style={{ padding: 14, border: 0, borderRadius: 9, background: isSubmitting ? '#999' : '#111', color: '#fff', fontWeight: 600, cursor: isSubmitting ? 'wait' : 'pointer' }}>{isSubmitting ? 'Saving product...' : 'Add Fabric Product'}</button>
      </div>
    </form>
  );
}
