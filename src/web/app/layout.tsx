import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'jsuites/dist/jsuites.css';
import 'jspreadsheet-ce/dist/jspreadsheet.css';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AZIBO INFOTECH PRIVATE LIMITED | Jigmesoft',
  description: 'Enquiry to pre-costing to WIP, order entry and CAD',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
