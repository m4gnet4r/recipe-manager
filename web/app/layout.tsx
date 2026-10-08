import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { NavBar } from '../components/NavBar';

export const metadata: Metadata = {
  title: 'Recipe System',
  description: 'Recipe composition & management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
