import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MKTF Tailoring - Workshop & Bespoke Production System',
  description: 'MKTF Tailoring Custom Kaftans, Embroidery Studio & Live Workshop Tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc' }}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}