import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function NewOrderPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: fabrics, error: fabricsError }, { data: designs, error: designsError }] =
    await Promise.all([
      supabase
        .from('fabrics')
        .select('id, name, colour, type, price, quantity')
        .order('name'),
      supabase
        .from('designs')
        .select('id, name, category, description, price')
        .order('name'),
    ]);

  if (fabricsError || designsError) {
    return (
      <main
        style={{
          maxWidth: '800px',
          margin: '60px auto',
          padding: '20px',
        }}
      >
        <Link href="/orders">← Back to My Orders</Link>

        <h1>Create New Order</h1>

        <p>Unable to load fabrics or designs.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: '800px',
        margin: '60px auto',
        padding: '20px',
      }}
    >
      <Link href="/orders">← Back to My Orders</Link>

      <h1>Create New Order</h1>

      <p>Start a new tailoring order.</p>

      <form>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="fabric">
            <strong>Fabric</strong>
          </label>
          <br />

          <select
            id="fabric"
            name="fabric"
            required
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="">Select a fabric</option>

            {fabrics?.map((fabric) => (
              <option key={fabric.id} value={fabric.id}>
                {fabric.name} - {fabric.colour} ({fabric.type})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="design">
            <strong>Design</strong>
          </label>
          <br />

          <select
            id="design"
            name="design"
            required
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="">Select a design</option>

            {designs?.map((design) => (
              <option key={design.id} value={design.id}>
                {design.name} - {design.category}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="instructions">
            <strong>Special instructions</strong>
          </label>
          <br />

          <textarea
            id="instructions"
            name="instructions"
            rows={5}
            placeholder="Add any special instructions for your order..."
            style={{ width: '100%', padding: '10px' }}
          />
        </div>

        <button type="submit">Create Order</button>
      </form>
    </main>
  );
}