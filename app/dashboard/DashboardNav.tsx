'use client';

import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function DashboardNav() {
  return (
    <nav
      style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '1px solid #ddd',
      }}
    >
      <Link href="/dashboard">Dashboard</Link>

      <Link href="/profile">My Profile</Link>

      <Link href="/orders">My Orders</Link>

      <LogoutButton />
    </nav>
  );
}