import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import MeasurementStep, { type MeasurementField } from './MeasurementStep';

type SearchParams = {
  fabric?: string | string[];
  category?: string | string[];
  design?: string | string[];
  style?: string | string[];
  step?: string | string[];
  measurements?: string | string[];
};

type Props = { searchParams: Promise<SearchParams> };

type Category = { id: string; name: string; display_order: number };
type Design = {
  id: string;
  reference_code: string | null;
  category_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  display_order: number;
};

const sewingStyles = [
  { value: 'baban-riga', label: 'Baban Riga', measurementCount: 11 },
  { value: 'kaftan', label: 'Kaftan', measurementCount: 9 },
] as const;

function MessageCard({
  title,
  children,
  tone = 'neutral',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <section style={messageCardStyle}>
      <p style={{ margin: 0, color: tone === 'error' ? '#a32121' : '#666', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        WhatsApp fabric selection
      </p>
      <h1 style={{ margin: '12px 0', fontSize: 26, lineHeight: 1.2 }}>{title}</h1>
      <div style={{ color: '#555', lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

function orderHref(fabric: string, category?: string, design?: string, style?: string) {
  const params = new URLSearchParams({ fabric });
  if (category) params.set('category', category);
  if (design) params.set('design', design);
  if (style) params.set('style', style);
  return `/order?${params.toString()}`;
}

export default async function OrderEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  const fabricReference = typeof params.fabric === 'string' ? params.fabric.trim() : '';
  const requestedCategory = typeof params.category === 'string' ? params.category : '';
  const requestedDesign = typeof params.design === 'string' ? params.design : '';
  const requestedStyle = typeof params.style === 'string' ? params.style : '';
  const hasStyleParameter = params.style !== undefined;

  if (!fabricReference) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Choose a fabric from WhatsApp">
          <p style={{ marginBottom: 0 }}>Open the Order in App link shared with your fabric picture to continue with that selection.</p>
        </MessageCard>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: option, error: optionError } = await supabase
    .from('fabric_options')
    .select('fabric_product_id, reference_code, is_active')
    .eq('reference_code', fabricReference)
    .maybeSingle();

  if (optionError) {
    return <main style={pageStyle}><MessageCard title="We couldn’t load this fabric" tone="error"><p style={{ marginBottom: 0 }}>Please try opening the WhatsApp link again in a moment.</p></MessageCard></main>;
  }
  if (!option) {
    return <main style={pageStyle}><MessageCard title="Fabric reference not found" tone="error"><p style={{ marginBottom: 0 }}>That fabric reference could not be found.</p></MessageCard></main>;
  }
  if (!option.is_active) {
    return <main style={pageStyle}><MessageCard title="Fabric no longer available" tone="error"><p style={{ marginBottom: 0 }}>This fabric is no longer available.</p></MessageCard></main>;
  }

  const { data: product, error: productError } = await supabase
    .from('fabric_products')
    .select('name, type, price')
    .eq('id', option.fabric_product_id)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) {
    return <main style={pageStyle}><MessageCard title="We couldn’t load this fabric" tone="error"><p style={{ marginBottom: 0 }}>Please try opening the WhatsApp link again in a moment.</p></MessageCard></main>;
  }
  if (!product) {
    return <main style={pageStyle}><MessageCard title="Fabric no longer available" tone="error"><p style={{ marginBottom: 0 }}>This fabric is no longer available.</p></MessageCard></main>;
  }

  const { data: categoryData, error: categoriesError } = await supabase
    .from('design_categories')
    .select('id, name, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  const categories = (categoryData ?? []) as Category[];
  const category = categories.find((item) => item.name === requestedCategory) ?? null;
  const invalidCategory = Boolean(requestedCategory && !category && !categoriesError);

  let designs: Design[] = [];
  let designsError = '';
  if (category) {
    const result = await supabase
      .from('design_items')
      .select('id, reference_code, category_id, name, description, image_path, display_order')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (result.error) designsError = result.error.message;
    designs = (result.data ?? []) as Design[];
  }

  const selectedDesign = category && requestedDesign
    ? designs.find((design) => design.reference_code === requestedDesign) ?? null
    : null;
  const invalidDesign = Boolean(category && requestedDesign && !selectedDesign && !designsError);
  const selectedStyle = selectedDesign ? sewingStyles.find((style) => style.value === requestedStyle) ?? null : null;
  const invalidStyle = Boolean(selectedDesign && hasStyleParameter && !selectedStyle);
  const readyForMeasurements = typeof params.step === 'string' && params.step === 'measurements' && Boolean(selectedStyle);

  let measurements: MeasurementField[] = [];
  let measurementError = '';
  let initialMeasurementValues: Record<string, string> = {};
  if (readyForMeasurements && selectedStyle) {
    const { data: styleRecord, error: styleError } = await supabase
      .from('sewing_styles')
      .select('id')
      .eq('name', selectedStyle.label)
      .maybeSingle();

    if (styleError || !styleRecord) {
      measurementError = 'We couldn’t load the measurements for this sewing style. Please try again.';
    } else {
      const { data: linkedMeasurements, error: linkedMeasurementsError } = await supabase
        .from('sewing_style_measurements')
        .select('display_order, is_active, measurement_definitions!inner(*)')
        .eq('sewing_style_id', styleRecord.id)
        .eq('is_active', true)
        .eq('measurement_definitions.is_active', true)
        .order('display_order', { ascending: true });

      if (linkedMeasurementsError) {
        measurementError = 'We couldn’t load the measurements for this sewing style. Please try again.';
      } else {
        const rows = (linkedMeasurements ?? []) as Array<{
          measurement_definitions: Record<string, unknown> | Array<Record<string, unknown>>;
        }>;
        const toText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
        const fields = rows.flatMap((row) => {
          const definition = Array.isArray(row.measurement_definitions)
            ? row.measurement_definitions[0]
            : row.measurement_definitions;
          if (!definition || definition.is_active === false) return [];

          const english = toText(definition.name_en) || toText(definition.english_name) || toText(definition.name);
          const hausa = toText(definition.name_hausa) || toText(definition.hausa_name);
          const label = toText(definition.display_name) || toText(definition.label) ||
            (english && hausa ? `${english} / ${hausa}` : english || hausa);
          if (!label) return [];
          const key = label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return key ? [{ key, label }] : [];
        });
        const uniqueKeys = new Set(fields.map((field) => field.key));
        if (fields.length !== selectedStyle.measurementCount || uniqueKeys.size !== fields.length) {
          measurementError = 'Measurements are not available for this sewing style right now. Please try again later.';
        } else {
          measurements = fields;
          if (typeof params.measurements === 'string') {
            try {
              const parsed: unknown = JSON.parse(params.measurements);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const stored = parsed as Record<string, unknown>;
                initialMeasurementValues = Object.fromEntries(fields.flatMap((field) => {
                  const value = stored[field.key];
                  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120
                    ? [[field.key, String(value)]]
                    : [];
                }));
              }
            } catch {
              initialMeasurementValues = {};
            }
          }
        }
      }
    }
  }

  const paths = designs.map((design) => design.image_path).filter((path): path is string => Boolean(path));
  const signedUrlByPath = new Map<string, string>();
  let imagesError = '';
  if (paths.length) {
    const { data, error } = await supabase.storage.from('designs').createSignedUrls(paths, 60 * 60);
    if (error) imagesError = error.message;
    data?.forEach((image, index) => {
      if (image?.signedUrl) signedUrlByPath.set(paths[index], image.signedUrl);
    });
  }

  const selectedImageUrl = selectedDesign?.image_path ? signedUrlByPath.get(selectedDesign.image_path) ?? null : null;

  return (
    <main style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 1080, display: 'grid', gap: 18 }}>
        <section style={fabricCardStyle}>
          <p style={{ margin: 0, color: '#176b4d', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selected from WhatsApp</p>
          <h1 style={{ margin: '10px 0 4px', fontSize: 25 }}>{product.name}</h1>
          {product.type && <p style={{ margin: '0 0 12px', color: '#666' }}>{product.type}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={referenceChipStyle}>Fabric reference: {option.reference_code}</span>
            <strong style={{ fontSize: 21 }}>₦{Number(product.price).toLocaleString('en-NG')}</strong>
          </div>
        </section>

        <section>
          <h2 style={{ margin: '8px 0 5px', fontSize: 23 }}>Choose a design category</h2>
          <p style={{ margin: '0 0 14px', color: '#666' }}>Your fabric selection will stay with you as you choose a design.</p>
          {categoriesError ? (
            <p role="alert" style={errorStyle}>Could not load design categories. Please try again.</p>
          ) : categories.length === 0 ? (
            <p style={emptyStyle}>There are no design categories available right now.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
              {categories.map((item) => {
                const isSelected = category?.id === item.id;
                return (
                  <Link key={item.id} href={orderHref(fabricReference, item.name)} aria-current={isSelected ? 'page' : undefined}
                    style={{ ...categoryButtonStyle, ...(isSelected ? selectedCategoryStyle : {}) }}>
                    {item.name}{isSelected ? ' ✓' : ''}
                  </Link>
                );
              })}
            </div>
          )}
          {invalidCategory && <p role="alert" style={{ ...errorStyle, marginTop: 12 }}>That category is no longer available. Choose an active category to continue.</p>}
        </section>

        {category && (
          <section>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: '4px 0', fontSize: 23 }}>{category.name} designs</h2>
              <p style={{ margin: 0, color: '#666' }}>Choose one design. Each card shows its permanent reference.</p>
            </div>
            {designsError ? (
              <p role="alert" style={errorStyle}>Could not load designs for this category. Please try again.</p>
            ) : imagesError ? (
              <p role="alert" style={errorStyle}>Some design images could not be loaded. Please refresh and try again.</p>
            ) : designs.length === 0 ? (
              <p style={emptyStyle}>There are no active designs in this category yet. Choose another category.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
                {designs.map((design) => {
                  const isSelected = selectedDesign?.id === design.id;
                  const imageUrl = design.image_path ? signedUrlByPath.get(design.image_path) : undefined;
                  const designCard = (
                    <>
                      <div style={{ position: 'relative', height: 300, background: '#f0f1f0' }}>
                        {imageUrl ? <Image src={imageUrl} alt={design.name} fill unoptimized style={{ objectFit: 'cover' }} /> :
                          <div style={{ display: 'grid', height: '100%', placeItems: 'center', padding: 16, color: '#666', textAlign: 'center' }}>Design image unavailable</div>}
                        {isSelected && <span style={selectedBadgeStyle}>Selected</span>}
                      </div>
                      <div style={{ padding: 15 }}>
                        <p style={{ margin: 0, color: design.reference_code ? '#176b4d' : '#777', fontSize: 14, fontWeight: 800, letterSpacing: '0.04em' }}>{design.reference_code ?? 'Reference not available'}</p>
                        <h3 style={{ margin: '5px 0 0', fontSize: 18 }}>{design.name}</h3>
                        {design.description && <p style={{ margin: '8px 0 0', color: '#666', lineHeight: 1.45 }}>{design.description}</p>}
                        {!design.reference_code && <p style={{ margin: '8px 0 0', color: '#8a5a00', fontSize: 13 }}>This design cannot be selected yet.</p>}
                      </div>
                    </>
                  );

                  return design.reference_code ? (
                    <Link key={design.id} href={orderHref(fabricReference, category.name, design.reference_code ?? '')}
                      aria-current={isSelected ? 'true' : undefined}
                      style={{ ...designCardStyle, ...(isSelected ? selectedDesignStyle : {}) }}>
                      {designCard}
                    </Link>
                  ) : <article key={design.id} style={{ ...designCardStyle, cursor: 'not-allowed', opacity: 0.8 }}>{designCard}</article>;
                })}
              </div>
            )}
            {invalidDesign && <p role="alert" style={{ ...errorStyle, marginTop: 12 }}>That design is no longer available. Please choose an active design.</p>}
          </section>
        )}

        {selectedDesign && (
          <section>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ margin: '4px 0', fontSize: 23 }}>Choose your sewing style</h2>
              <p style={{ margin: 0, color: '#666' }}>Choose one style for your selected design.</p>
            </div>
            {invalidStyle && <p role="alert" style={{ ...errorStyle, marginBottom: 12 }}>That sewing style is not available. Choose Baban Riga or Kaftan to continue.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {sewingStyles.map((style) => {
                const isSelected = selectedStyle?.value === style.value;
                return (
                  <Link key={style.value} href={orderHref(fabricReference, category?.name ?? '', selectedDesign.reference_code ?? '', style.value)}
                    aria-current={isSelected ? 'true' : undefined}
                    style={{ ...sewingStyleCard, ...(isSelected ? selectedSewingStyleCard : {}) }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{style.label}</span>
                    <span aria-hidden="true" style={{ color: isSelected ? '#176b4d' : '#999', fontSize: 20 }}>{isSelected ? '✓' : '○'}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section style={selectedSummaryStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {selectedDesign && selectedImageUrl && <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0, overflow: 'hidden', borderRadius: 10 }}><Image src={selectedImageUrl} alt={selectedDesign.name} fill unoptimized style={{ objectFit: 'cover' }} /></div>}
            <div>
              <p style={{ margin: 0, color: '#176b4d', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{selectedDesign ? 'Your selection' : 'Design selection required'}</p>
              {selectedDesign ? <>
                <h2 style={{ margin: '5px 0', fontSize: 20 }}>{selectedDesign.name}</h2>
                <p style={{ margin: 0, color: '#555' }}>{category?.name ?? ''} · <strong>{selectedDesign.reference_code}</strong>{selectedStyle ? <> · <strong>{selectedStyle.label}</strong></> : null}</p>
              </> : <p style={{ margin: '5px 0 0', color: '#555' }}>Choose one design above to continue.</p>}
            </div>
          </div>
          {!readyForMeasurements && <form action="/order" method="get" style={{ width: '100%', maxWidth: 260 }}>
            <input type="hidden" name="fabric" value={fabricReference} />
            <input type="hidden" name="category" value={category?.name ?? ''} />
            <input type="hidden" name="design" value={selectedDesign?.reference_code ?? ''} />
            <input type="hidden" name="style" value={selectedStyle?.value ?? ''} />
            <input type="hidden" name="step" value="measurements" />
            <button type="submit" disabled={!selectedStyle} style={{ ...continueButtonStyle, ...(selectedStyle ? {} : disabledButtonStyle) }}>Continue</button>
            <p style={{ margin: '8px 0 0', color: '#666', fontSize: 12, textAlign: 'center' }}>{selectedStyle ? 'Continue when you are ready for the next step.' : 'Choose a sewing style to continue.'}</p>
          </form>}
        </section>

        {readyForMeasurements && (measurementError
          ? <p role="alert" style={errorStyle}>{measurementError}</p>
          : <MeasurementStep measurements={measurements} initialValues={initialMeasurementValues} />)}
      </div>
    </main>
  );
}

const pageStyle = { display: 'flex', minHeight: 'calc(100vh - 80px)', justifyContent: 'center', padding: '24px 16px 48px', background: '#f7f8f7' } as const;
const messageCardStyle = { width: '100%', maxWidth: 520, padding: 24, border: '1px solid #e3e3e3', borderRadius: 16, background: '#fff', boxShadow: '0 8px 28px rgba(0, 0, 0, 0.05)' } as const;
const fabricCardStyle = { padding: 20, border: '1px solid #dfe7e2', borderRadius: 14, background: '#fff', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)' } as const;
const referenceChipStyle = { display: 'inline-block', padding: '8px 10px', borderRadius: 8, background: '#f0f5f2', color: '#176b4d', fontSize: 13, fontWeight: 700 } as const;
const categoryButtonStyle = { display: 'block', padding: '13px 12px', border: '1px solid #d8d8d8', borderRadius: 10, background: '#fff', color: '#333', textAlign: 'center' as const, textDecoration: 'none', fontWeight: 600 } as const;
const selectedCategoryStyle = { border: '2px solid #176b4d', background: '#f1f8f3', color: '#14543e' } as const;
const designCardStyle = { overflow: 'hidden', border: '2px solid transparent', borderRadius: 14, background: '#fff', color: 'inherit', textDecoration: 'none', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.05)' } as const;
const selectedDesignStyle = { border: '2px solid #176b4d', boxShadow: '0 0 0 2px rgba(23, 107, 77, 0.12)' } as const;
const selectedBadgeStyle = { position: 'absolute' as const, top: 12, right: 12, padding: '7px 10px', borderRadius: 20, background: '#176b4d', color: '#fff', fontSize: 13, fontWeight: 700 };
const selectedSummaryStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16, padding: 18, border: '1px solid #cde5d6', borderRadius: 14, background: '#f4fbf6' } as const;
const sewingStyleCard = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 72, padding: '16px 18px', border: '2px solid #d8d8d8', borderRadius: 12, background: '#fff', color: '#222', textDecoration: 'none', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)' } as const;
const selectedSewingStyleCard = { borderColor: '#176b4d', background: '#f1f8f3', color: '#14543e', boxShadow: '0 0 0 2px rgba(23, 107, 77, 0.12)' } as const;
const continueButtonStyle = { width: '100%', padding: 14, border: 0, borderRadius: 9, background: '#176b4d', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' } as const;
const disabledButtonStyle = { background: '#aaa', cursor: 'not-allowed' } as const;
const errorStyle = { margin: 0, padding: 14, border: '1px solid #efc8c8', borderRadius: 10, background: '#fff4f4', color: '#a32121' } as const;
const emptyStyle = { margin: 0, padding: 18, border: '1px dashed #ccc', borderRadius: 10, background: '#fff', color: '#666' } as const;
