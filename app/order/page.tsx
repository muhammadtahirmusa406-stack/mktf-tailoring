import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import MeasurementStep from './MeasurementStep';
import ReviewOrder from './ReviewOrder';
import { isValidMeasurementValue, parseMeasurementValues, type MeasurementField } from './measurement-values';

type SearchParams = {
  fabric?: string | string[];
  category?: string | string[];
  style?: string | string[];
  priceGroup?: string | string[];
  design?: string | string[];
  step?: string | string[];
  measurements?: string | string[];
};

type Props = { searchParams: Promise<SearchParams> };

type Category = { id: string; name: string; display_order: number };
type SewingStyleRecord = { id: string; name: string; sewing_charge: number; is_active: boolean };
type PriceGroup = { id: string; category_id: string; sewing_style_id: string; price: number; cover_design_item_id: string | null };
type DesignItem = { id: string; reference_code: string | null; name: string; description: string | null; image_path: string | null; price_group_id: string | null };

const sewingStylesConfig = [
  { value: 'baban-riga', label: 'Baban Riga', measurementCount: 11 },
  { value: 'kaftan', label: 'Kaftan', measurementCount: 9 },
] as const;

function MessageCard({ title, children, tone = 'neutral' }: { title: string; children: React.ReactNode; tone?: 'neutral' | 'error' }) {
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

function orderHref(params: {
  fabric: string;
  category?: string;
  style?: string;
  priceGroup?: string;
  design?: string;
  step?: string;
  measurements?: string;
}) {
  const q = new URLSearchParams({ fabric: params.fabric });
  if (params.category) q.set('category', params.category);
  if (params.style) q.set('style', params.style);
  if (params.priceGroup) q.set('priceGroup', params.priceGroup);
  if (params.design) q.set('design', params.design);
  if (params.step) q.set('step', params.step);
  if (params.measurements) q.set('measurements', params.measurements);
  return `/order?${q.toString()}`;
}

export default async function OrderEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  const fabricReference = typeof params.fabric === 'string' ? params.fabric.trim() : '';
  const requestedCategory = typeof params.category === 'string' ? params.category : '';
  const requestedStyle = typeof params.style === 'string' ? params.style : '';
  const requestedPriceGroup = typeof params.priceGroup === 'string' ? params.priceGroup : '';
  const requestedDesign = typeof params.design === 'string' ? params.design : '';
  const isReviewStep = params.step === 'review';

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

  // 1. Validate Fabric Option
  const { data: option, error: optionError } = await supabase
    .from('fabric_options')
    .select('fabric_product_id, reference_code, is_active')
    .eq('reference_code', fabricReference)
    .maybeSingle();

  if (optionError || !option) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric reference not found" tone="error">
          <p style={{ marginBottom: 0 }}>That fabric reference could not be found.</p>
        </MessageCard>
      </main>
    );
  }
  if (!option.is_active) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric no longer available" tone="error">
          <p style={{ marginBottom: 0 }}>This fabric is no longer available.</p>
        </MessageCard>
      </main>
    );
  }

  // 2. Validate Fabric Product
  const { data: product, error: productError } = await supabase
    .from('fabric_products')
    .select('name, type, price')
    .eq('id', option.fabric_product_id)
    .eq('is_active', true)
    .maybeSingle();

  if (productError || !product) {
    return (
      <main style={pageStyle}>
        <MessageCard title="Fabric no longer available" tone="error">
          <p style={{ marginBottom: 0 }}>This fabric is no longer available.</p>
        </MessageCard>
      </main>
    );
  }

  // 3. Load Design Categories
  const { data: categoriesData } = await supabase
    .from('design_categories')
    .select('id, name, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  const categories = (categoriesData ?? []) as Category[];
  const selectedCategory = categories.find((c) => c.name === requestedCategory) ?? null;

  // 4. Load Sewing Styles
  const { data: stylesData } = await supabase
    .from('sewing_styles')
    .select('id, name, sewing_charge, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  const dbStyles = (stylesData ?? []) as SewingStyleRecord[];
  const selectedStyleConfig = sewingStylesConfig.find((s) => s.value === requestedStyle) ?? null;
  const selectedStyleRecord = selectedStyleConfig
    ? dbStyles.find((s) => s.name.toLowerCase() === selectedStyleConfig.label.toLowerCase()) ?? null
    : null;

  // 5. Load Price Groups if Category and Style are chosen
  let priceGroups: PriceGroup[] = [];
  let priceGroupsError = '';
  if (selectedCategory && selectedStyleRecord) {
    const { data: pgData, error: pgErr } = await supabase
      .from('design_price_groups')
      .select('id, category_id, sewing_style_id, price, cover_design_item_id')
      .eq('category_id', selectedCategory.id)
      .eq('sewing_style_id', selectedStyleRecord.id)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (pgErr) priceGroupsError = pgErr.message;
    priceGroups = (pgData ?? []) as PriceGroup[];
  }

  const selectedPriceGroup = priceGroups.find((pg) => pg.id === requestedPriceGroup) ?? null;

  // 6. Load Design Items (Exact Pictures) belonging to selected Price Group
  let designItems: DesignItem[] = [];
  let designItemsError = '';
  if (selectedPriceGroup) {
    const { data: diData, error: diErr } = await supabase
      .from('design_items')
      .select('id, reference_code, name, description, image_path, price_group_id')
      .eq('price_group_id', selectedPriceGroup.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (diErr) designItemsError = diErr.message;
    designItems = (diData ?? []) as DesignItem[];
  }

  const selectedDesignItem = designItems.find((d) => d.reference_code === requestedDesign) ?? null;

  // 7. Collect Storage Image Paths for Signed URLs (Covers + Exact Pictures)
  const pathsToSign: string[] = [];

  // Get cover image paths for price groups
  const coverItemIds = priceGroups.map((pg) => pg.cover_design_item_id).filter((id): id is string => Boolean(id));
  const coverPathById = new Map<string, string>();
  if (coverItemIds.length > 0) {
    const { data: covers } = await supabase
      .from('design_items')
      .select('id, image_path')
      .in('id', coverItemIds);
    covers?.forEach((c) => {
      if (c.image_path) {
        coverPathById.set(c.id, c.image_path);
        pathsToSign.push(c.image_path);
      }
    });
  }

  // Add exact design pictures
  designItems.forEach((d) => {
    if (d.image_path) pathsToSign.push(d.image_path);
  });

  const signedUrlByPath = new Map<string, string>();
  if (pathsToSign.length > 0) {
    const { data: signedUrls } = await supabase.storage.from('designs').createSignedUrls(pathsToSign, 60 * 60);
    signedUrls?.forEach((item, index) => {
      if (item?.signedUrl) signedUrlByPath.set(pathsToSign[index], item.signedUrl);
    });
  }

  // 8. Load Measurements if ready
  const readyForMeasurements = (params.step === 'measurements' || isReviewStep) && Boolean(selectedDesignItem && selectedStyleRecord && selectedStyleConfig);
  let measurements: MeasurementField[] = [];
  let measurementError = '';
  let initialMeasurementValues: Record<string, string> = {};

  if (readyForMeasurements && selectedStyleRecord && selectedStyleConfig) {
    const { data: linkedMeasurements, error: linkedErr } = await supabase
      .from('sewing_style_measurements')
      .select('display_order, is_active, measurement_definitions!inner(*)')
      .eq('sewing_style_id', selectedStyleRecord.id)
      .eq('is_active', true)
      .eq('measurement_definitions.is_active', true)
      .order('display_order', { ascending: true });

    if (linkedErr) {
      measurementError = 'Could not load measurements for this sewing style.';
    } else {
      const rows = (linkedMeasurements ?? []) as Array<{
        measurement_definitions: Record<string, unknown> | Array<Record<string, unknown>>;
      }>;
      const toText = (val: unknown) => (typeof val === 'string' ? val.trim() : '');
      const fields = rows.flatMap((row) => {
        const def = Array.isArray(row.measurement_definitions) ? row.measurement_definitions[0] : row.measurement_definitions;
        if (!def || def.is_active === false) return [];
        const english = toText(def.name_en) || toText(def.english_name) || toText(def.name);
        const hausa = toText(def.name_hausa) || toText(def.hausa_name);
        const label = toText(def.display_name) || toText(def.label) || (english && hausa ? `${english} / ${hausa}` : english || hausa);
        if (!label) return [];
        const key = label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return key ? [{ key, label }] : [];
      });

      if (fields.length !== selectedStyleConfig.measurementCount) {
        measurementError = 'Measurements configuration is incomplete for this style.';
      } else {
        measurements = fields;
        initialMeasurementValues = parseMeasurementValues(
          typeof params.measurements === 'string' ? params.measurements : undefined,
          fields
        );
      }
    }
  }

  const selectedImageUrl = selectedDesignItem?.image_path ? signedUrlByPath.get(selectedDesignItem.image_path) ?? null : null;
  const measurementValuesComplete =
    measurements.length === selectedStyleConfig?.measurementCount &&
    measurements.every((m) => isValidMeasurementValue(initialMeasurementValues[m.key]));

  return (
    <main style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 1080, display: 'grid', gap: 20 }}>
        {/* Fabric Header Card */}
        <section style={fabricCardStyle}>
          <p style={{ margin: 0, color: '#176b4d', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Selected from WhatsApp</p>
          <h1 style={{ margin: '10px 0 4px', fontSize: 25 }}>{product.name}</h1>
          {product.type && <p style={{ margin: '0 0 12px', color: '#666' }}>{product.type}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={referenceChipStyle}>Fabric reference: {option.reference_code}</span>
            <strong style={{ fontSize: 21 }}>?{Number(product.price).toLocaleString('en-NG')}</strong>
          </div>
        </section>

        {isReviewStep ? (
          measurementError || !readyForMeasurements ? (
            <div>
              <p role="alert" style={errorStyle}>{measurementError || 'Your selections are incomplete. Please return to measurements.'}</p>
              <Link href={orderHref({ fabric: fabricReference, category: selectedCategory?.name, style: selectedStyleConfig?.value, priceGroup: selectedPriceGroup?.id, design: selectedDesignItem?.reference_code ?? undefined, step: 'measurements' })} style={returnLinkStyle}>
                Return to measurements
              </Link>
            </div>
          ) : !selectedDesignItem || !selectedCategory || !selectedStyleRecord || !selectedStyleConfig || !selectedPriceGroup || !measurementValuesComplete ? (
            <div>
              <p role="alert" style={errorStyle}>Some required measurement values are missing or invalid.</p>
              <Link href={orderHref({ fabric: fabricReference, category: selectedCategory?.name, style: selectedStyleConfig?.value, priceGroup: selectedPriceGroup?.id, design: selectedDesignItem?.reference_code ?? undefined, step: 'measurements' })} style={returnLinkStyle}>
                Return to measurements
              </Link>
            </div>
          ) : (
            <ReviewOrder
              fabric={{ name: product.name, type: product.type, price: Number(product.price), reference: option.reference_code }}
              design={{ category: selectedCategory.name, name: selectedDesignItem.name, reference: selectedDesignItem.reference_code ?? '', price: Number(selectedPriceGroup.price), imageUrl: selectedImageUrl }}
              sewingStyle={{ id: selectedStyleRecord.id, label: selectedStyleConfig.label, value: selectedStyleConfig.value, charge: Number(selectedStyleRecord.sewing_charge ?? 0) }}
              measurementsJson={JSON.stringify(Object.fromEntries(measurements.map((m) => [m.key, Number(initialMeasurementValues[m.key])])))}
              measurements={measurements.map((m) => ({ label: m.label, value: Number(initialMeasurementValues[m.key]) }))}
              editMeasurementsHref={orderHref({
                fabric: fabricReference,
                category: selectedCategory.name,
                style: selectedStyleConfig.value,
                priceGroup: selectedPriceGroup.id,
                design: selectedDesignItem.reference_code ?? undefined,
                step: 'measurements',
                measurements: JSON.stringify(Object.fromEntries(measurements.map((m) => [m.key, Number(initialMeasurementValues[m.key])]))),
              })}
            />
          )
        ) : (
          <>
            {/* Step 1: Design Category */}
            <section>
              <div style={{ marginBottom: 12 }}>
                <span style={stepBadgeStyle}>Step 1</span>
                <h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>Choose a design category</h2>
                <p style={{ margin: 0, color: '#666' }}>Select the category of design you want embroidered.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {categories.map((item) => {
                  const isSelected = selectedCategory?.id === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={orderHref({ fabric: fabricReference, category: item.name })}
                      style={{ ...categoryButtonStyle, ...(isSelected ? selectedCategoryStyle : {}) }}
                    >
                      {item.name} {isSelected ? '?' : ''}
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Sewing Style */}
            {selectedCategory && (
              <section>
                <div style={{ marginBottom: 12 }}>
                  <span style={stepBadgeStyle}>Step 2</span>
                  <h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>Choose sewing style</h2>
                  <p style={{ margin: 0, color: '#666' }}>Choose Baban Riga or Kaftan for this order.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {sewingStylesConfig.map((style) => {
                    const isSelected = selectedStyleConfig?.value === style.value;
                    const dbRecord = dbStyles.find((s) => s.name.toLowerCase() === style.label.toLowerCase());
                    const charge = dbRecord ? Number(dbRecord.sewing_charge ?? 0) : 0;
                    return (
                      <Link
                        key={style.value}
                        href={orderHref({ fabric: fabricReference, category: selectedCategory.name, style: style.value })}
                        style={{ ...sewingStyleCard, ...(isSelected ? selectedSewingStyleCard : {}) }}
                      >
                        <div>
                          <strong style={{ fontSize: 17, display: 'block' }}>{style.label}</strong>
                          <span style={{ fontSize: 13, color: '#666' }}>Sewing charge: ?{charge.toLocaleString('en-NG')}</span>
                        </div>
                        <span style={{ color: isSelected ? '#176b4d' : '#bbb', fontSize: 20 }}>{isSelected ? '?' : '?'}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step 3: Price Groups */}
            {selectedCategory && selectedStyleConfig && (
              <section>
                <div style={{ marginBottom: 12 }}>
                  <span style={stepBadgeStyle}>Step 3</span>
                  <h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>Choose a price option</h2>
                  <p style={{ margin: 0, color: '#666' }}>Different design styles are grouped by price. Tap an option to see available designs.</p>
                </div>
                {priceGroupsError ? (
                  <p role="alert" style={errorStyle}>Could not load price groups. Please try again.</p>
                ) : priceGroups.length === 0 ? (
                  <p style={emptyStyle}>No price groups have been uploaded for {selectedCategory.name} ? {selectedStyleConfig.label} yet.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
                    {priceGroups.map((pg) => {
                      const isSelected = selectedPriceGroup?.id === pg.id;
                      const coverPath = pg.cover_design_item_id ? coverPathById.get(pg.cover_design_item_id) : null;
                      const coverUrl = coverPath ? signedUrlByPath.get(coverPath) : null;
                      return (
                        <Link
                          key={pg.id}
                          href={orderHref({ fabric: fabricReference, category: selectedCategory.name, style: selectedStyleConfig.value, priceGroup: pg.id })}
                          style={{ ...priceGroupCardStyle, ...(isSelected ? selectedPriceGroupStyle : {}) }}
                        >
                          <div style={{ position: 'relative', height: 180, background: '#f0f1f0' }}>
                            {coverUrl ? (
                              <Image src={coverUrl} alt={`Price Group ?${pg.price}`} fill unoptimized style={{ objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#888', fontSize: 13 }}>Cover image</div>
                            )}
                            {isSelected && <span style={selectedBadgeStyle}>Selected Option</span>}
                          </div>
                          <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Design Price</span>
                              <strong style={{ display: 'block', fontSize: 18, color: '#176b4d' }}>?{Number(pg.price).toLocaleString('en-NG')}</strong>
                            </div>
                            <span style={{ color: isSelected ? '#176b4d' : '#888', fontWeight: 700 }}>{isSelected ? 'Selected' : 'View Pictures ?'}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Step 4: Exact Design Pictures within Price Group */}
            {selectedPriceGroup && (
              <section>
                <div style={{ marginBottom: 12 }}>
                  <span style={stepBadgeStyle}>Step 4</span>
                  <h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>Select exact design picture</h2>
                  <p style={{ margin: 0, color: '#666' }}>Choose the exact embroidery picture you want sewn. Reference code is saved to your order.</p>
                </div>
                {designItemsError ? (
                  <p role="alert" style={errorStyle}>Could not load pictures for this price group.</p>
                ) : designItems.length === 0 ? (
                  <p style={emptyStyle}>No pictures found under this price group.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
                    {designItems.map((item) => {
                      const isSelected = selectedDesignItem?.id === item.id;
                      const imageUrl = item.image_path ? signedUrlByPath.get(item.image_path) : null;
                      return (
                        <Link
                          key={item.id}
                          href={orderHref({ fabric: fabricReference, category: selectedCategory?.name, style: selectedStyleConfig?.value, priceGroup: selectedPriceGroup.id, design: item.reference_code ?? undefined })}
                          style={{ ...exactPictureCardStyle, ...(isSelected ? selectedPictureStyle : {}) }}
                        >
                          <div style={{ position: 'relative', height: 260, background: '#f0f1f0' }}>
                            {imageUrl ? (
                              <Image src={imageUrl} alt={item.name} fill unoptimized style={{ objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#888' }}>Image unavailable</div>
                            )}
                            {isSelected && <span style={selectedBadgeStyle}>Selected Picture</span>}
                          </div>
                          <div style={{ padding: 12 }}>
                            <p style={{ margin: 0, color: '#176b4d', fontSize: 13, fontWeight: 800 }}>{item.reference_code ?? 'No ref'}</p>
                            <h4 style={{ margin: '4px 0 0', fontSize: 15 }}>{item.name}</h4>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Selection Summary Banner & Measurements Trigger */}
            <section style={selectedSummaryStyle}>
              <div>
                <p style={{ margin: 0, color: '#176b4d', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedDesignItem ? 'Selections Complete' : 'Order Selection Progress'}
                </p>
                <div style={{ marginTop: 4, color: '#333', fontSize: 14, lineHeight: 1.6 }}>
                  <div>Category: <strong>{selectedCategory ? selectedCategory.name : 'Not selected'}</strong></div>
                  <div>Style: <strong>{selectedStyleConfig ? selectedStyleConfig.label : 'Not selected'}</strong></div>
                  <div>Design Option: <strong>{selectedPriceGroup ? `?${Number(selectedPriceGroup.price).toLocaleString('en-NG')}` : 'Not selected'}</strong></div>
                  <div>Exact Picture: <strong>{selectedDesignItem ? selectedDesignItem.reference_code : 'Not selected'}</strong></div>
                </div>
              </div>

              {!readyForMeasurements && (
                <form action="/order" method="get" style={{ width: '100%', maxWidth: 280 }}>
                  <input type="hidden" name="fabric" value={fabricReference} />
                  <input type="hidden" name="category" value={selectedCategory?.name ?? ''} />
                  <input type="hidden" name="style" value={selectedStyleConfig?.value ?? ''} />
                  <input type="hidden" name="priceGroup" value={selectedPriceGroup?.id ?? ''} />
                  <input type="hidden" name="design" value={selectedDesignItem?.reference_code ?? ''} />
                  <input type="hidden" name="step" value="measurements" />
                  <button
                    type="submit"
                    disabled={!selectedDesignItem}
                    style={{ ...continueButtonStyle, ...(selectedDesignItem ? {} : disabledButtonStyle) }}
                  >
                    Enter Measurements ?
                  </button>
                  <p style={{ margin: '8px 0 0', color: '#666', fontSize: 12, textAlign: 'center' }}>
                    {selectedDesignItem ? 'Ready to enter measurements.' : 'Complete steps 1�4 to proceed.'}
                  </p>
                </form>
              )}
            </section>

            {/* Step 5: Measurements */}
            {readyForMeasurements && (
              measurementError
                ? <p role="alert" style={errorStyle}>{measurementError}</p>
                : <MeasurementStep measurements={measurements} initialValues={initialMeasurementValues} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

const pageStyle = { display: 'flex', minHeight: 'calc(100vh - 80px)', justifyContent: 'center', padding: '24px 16px 48px', background: '#f7f8f7' } as const;
const messageCardStyle = { width: '100%', maxWidth: 520, padding: 24, border: '1px solid #e3e3e3', borderRadius: 16, background: '#fff', boxShadow: '0 8px 28px rgba(0, 0, 0, 0.05)' } as const;
const fabricCardStyle = { padding: 20, border: '1px solid #dfe7e2', borderRadius: 14, background: '#fff', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)' } as const;
const referenceChipStyle = { display: 'inline-block', padding: '8px 10px', borderRadius: 8, background: '#f0f5f2', color: '#176b4d', fontSize: 13, fontWeight: 700 } as const;
const stepBadgeStyle = { display: 'inline-block', padding: '3px 8px', borderRadius: 6, background: '#e4f0e9', color: '#176b4d', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const };
const categoryButtonStyle = { display: 'block', padding: '13px 12px', border: '1px solid #d8d8d8', borderRadius: 10, background: '#fff', color: '#333', textAlign: 'center' as const, textDecoration: 'none', fontWeight: 600 } as const;
const selectedCategoryStyle = { border: '2px solid #176b4d', background: '#f1f8f3', color: '#14543e' } as const;
const sewingStyleCard = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 72, padding: '16px 18px', border: '2px solid #d8d8d8', borderRadius: 12, background: '#fff', color: '#222', textDecoration: 'none', boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)' } as const;
const selectedSewingStyleCard = { borderColor: '#176b4d', background: '#f1f8f3', color: '#14543e', boxShadow: '0 0 0 2px rgba(23, 107, 77, 0.12)' } as const;
const priceGroupCardStyle = { overflow: 'hidden', border: '2px solid #e2e5e3', borderRadius: 12, background: '#fff', color: 'inherit', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)' } as const;
const selectedPriceGroupStyle = { borderColor: '#176b4d', boxShadow: '0 0 0 2px rgba(23, 107, 77, 0.2)' } as const;
const exactPictureCardStyle = { overflow: 'hidden', border: '2px solid #e2e5e3', borderRadius: 12, background: '#fff', color: 'inherit', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)' } as const;
const selectedPictureStyle = { borderColor: '#176b4d', boxShadow: '0 0 0 2px rgba(23, 107, 77, 0.2)' } as const;
const selectedBadgeStyle = { position: 'absolute' as const, top: 10, right: 10, padding: '5px 9px', borderRadius: 14, background: '#176b4d', color: '#fff', fontSize: 12, fontWeight: 700 };
const selectedSummaryStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 16, padding: 18, border: '1px solid #cde5d6', borderRadius: 14, background: '#f4fbf6' } as const;
const continueButtonStyle = { width: '100%', padding: 14, border: 0, borderRadius: 9, background: '#176b4d', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' } as const;
const disabledButtonStyle = { background: '#aaa', cursor: 'not-allowed' } as const;
const returnLinkStyle = { display: 'inline-block', marginTop: 12, color: '#176b4d', fontWeight: 700 } as const;
const errorStyle = { margin: 0, padding: 14, border: '1px solid #efc8c8', borderRadius: 10, background: '#fff4f4', color: '#a32121' } as const;
const emptyStyle = { margin: 0, padding: 16, border: '1px dashed #ccc', borderRadius: 10, background: '#fff', color: '#666' } as const;
