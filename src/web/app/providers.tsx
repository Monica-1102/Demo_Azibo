'use client';
import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 15_000 } } }),
  );
  return (
    <ConfigProvider
      theme={{
        // Colours and type of the current Jigmesoft screens (navy #022B61, Arial 13px, square corners).
        token: {
          colorPrimary: '#022B61',
          colorLink: '#055EE1',
          colorText: '#333333',
          fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
          fontSize: 13,
          borderRadius: 2,
          colorBorder: '#d2d6de',
        },
        components: {
          Table: { headerBg: '#e5e6e6', headerColor: '#022B61', rowHoverBg: '#f5f5f5', cellPaddingBlockSM: 6 },
          Tabs: { itemSelectedColor: '#022B61', inkBarColor: '#022B61', itemHoverColor: '#022B61' },
        },
      }}
      componentSize="middle"
    >
      <AntApp>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
