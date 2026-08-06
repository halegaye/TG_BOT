import './globals.css';
import Providers from './providers';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Telegram Enterprise Campaign Platform',
  description: 'Multi-Tenant Telegram Bot & Campaign Management System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
