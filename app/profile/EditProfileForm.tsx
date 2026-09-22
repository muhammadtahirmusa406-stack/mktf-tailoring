'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type EditProfileFormProps = {
  userId: string;
  initialFullName: string;
  initialPhone: string;
};

export default function EditProfileForm({
  userId,
  initialFullName,
  initialPhone,
}: EditProfileFormProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage('');
    setError('');
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', userId);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage('Profile updated successfully.');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="fullName">Full name</label>
        <br />
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          style={{ width: '100%', padding: '10px' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="phone">Phone</label>
        <br />
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          style={{ width: '100%', padding: '10px' }}
        />
      </div>

      {error && <p>{error}</p>}

      {message && <p>{message}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}