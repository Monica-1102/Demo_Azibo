'use client';
import { USER_TYPE_MERCHANT } from '@shared/constants';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Me } from './types';

export function useMe() {
  const q = useQuery({ queryKey: ['me'], queryFn: () => api.get<Me>('/auth/me'), staleTime: 5 * 60_000 });
  return { ...q, me: q.data, isMerchant: q.data?.userType === USER_TYPE_MERCHANT };
}
