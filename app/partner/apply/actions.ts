'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitShopApplicationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/partner/apply');
  }

  const shopName = formData.get('shopName') as string;
  const location = formData.get('location') as string;
  const phone = formData.get('phone') as string;
  const equipmentCount = parseInt((formData.get('equipmentCount') as string) || '1', 10);
  const capacityTier = (formData.get('capacityTier') as string) || 'medium';
  const agreedToTerms = formData.get('termsAgreement') === 'on';

  if (!shopName || !location || !phone) {
    throw new Error('Please fill in all required workshop details.');
  }

  if (!agreedToTerms) {
    throw new Error('You must accept the terms of service and quality standards to apply.');
  }

  // Create workshop application
  const { error } = await supabase.from('child_shops').insert({
    owner_profile_id: user.id,
    name: shopName.trim(),
    location: location.trim(),
    phone: phone.trim(),
    equipment_count: isNaN(equipmentCount) ? 1 : equipmentCount,
    capacity_tier: capacityTier,
    agreed_to_terms: true,
    terms_agreed_at: new Date().toISOString(),
    status: 'pending',
  });

  if (error) {
    throw new Error(`Failed to submit application: ${error.message}`);
  }

  redirect('/partner/status');
}