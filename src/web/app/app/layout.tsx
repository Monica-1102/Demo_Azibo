'use client';
// Page shell in the look of the current Jigmesoft screens (company/template/templateheader.php):
// navy title bar "| company |  | subscriber | dept | name | designation | avatar", a grey
// horizontal menu with dropdowns, and the navy copyright footer.
import { CaretDownOutlined, UserOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Dropdown, Spin } from 'antd';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/use-me';

export default function AppShell({ children }: { children: ReactNode }) {
  const { me, isMerchant, isLoading } = useMe();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const qc = useQueryClient();

  if (isLoading || !me) return <Spin style={{ display: 'block', marginTop: 120 }} />;

  const inWip = pathname.startsWith('/app/wip') || pathname.startsWith('/app/order');

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    qc.clear();
    router.replace('/login/');
  }

  const enquiryMenu = {
    items: [
      { key: 'list', label: <Link href="/app/enquiries/">Enquiry List</Link> },
      ...(isMerchant ? [{ key: 'new', label: <Link href="/app/enquiries/new/">Add New Enquiry</Link> }] : []),
    ],
  };
  const wipMenu = { items: [{ key: 'wip', label: <Link href="/app/wip/">WIP List</Link> }] };

  return (
    <div className="jg-page">
      <header className="jg-topbar">
        <span className="jg-company">|<span>{me.company.name}</span>|</span>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{ items: [{ key: 'out', label: 'Sign out', onClick: logout }] }}
        >
          <button type="button" className="jg-profile" aria-label="User menu">
            |<span>{me.company.prefix}</span>|<span>{me.userTypeName}</span>|<span>{me.fullName}</span>|
            <span>{isMerchant ? 'Merchandiser' : me.userTypeName}</span>|
            <span className="jg-avatar"><UserOutlined /></span>
          </button>
        </Dropdown>
      </header>

      <nav className="jg-menubar" aria-label="Main menu">
        <Dropdown menu={enquiryMenu} trigger={['click', 'hover']}>
          <button type="button" className={!inWip ? 'active' : ''}>Enquiry List <CaretDownOutlined /></button>
        </Dropdown>
        <Dropdown menu={wipMenu} trigger={['click', 'hover']}>
          <button type="button" className={inWip ? 'active' : ''}>WIP List <CaretDownOutlined /></button>
        </Dropdown>
      </nav>

      <main className="jg-content">{children}</main>

      <footer className="jg-footer">
        <strong>Copyright © 2019-{new Date().getFullYear()} AZIBO INFOTECH PRIVATE LIMITED.</strong> All rights reserved.
      </footer>
    </div>
  );
}
