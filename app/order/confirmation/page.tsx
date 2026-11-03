import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ ref?: string }>;
};

export default async function OrderConfirmationFallback({ searchParams }: Props) {
  const { ref } = await searchParams;
  if (ref) {
    redirect(`/order/success?ref=${ref}`);
  }
  redirect('/order/new');
}
