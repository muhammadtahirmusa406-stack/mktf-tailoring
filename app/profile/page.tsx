import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EditProfileForm from './EditProfileForm';

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, email, phone, role')
    .eq('id', user.id)
    .single();

  if (error) {
    return (
      <main style={{ maxWidth: '800px', margin: '60px auto', padding: '20px' }}>
        <h1>Customer Profile</h1>
        <p>Unable to load your profile.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '800px', margin: '60px auto', padding: '20px' }}>
      <h1>Customer Profile</h1>

      <p>
        <strong>Email:</strong> {profile.email || user.email}
      </p>

      <p>
        <strong>Account type:</strong> {profile.role}
      </p>

      <hr style={{ margin: '30px 0' }} />

      <h2>Edit profile</h2>

      <EditProfileForm
        userId={user.id}
        initialFullName={profile.full_name || ''}
        initialPhone={profile.phone || ''}
      />
    </main>
  );
}