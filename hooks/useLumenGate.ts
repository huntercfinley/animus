import { useCallback, useState } from 'react';

export interface LumenGateState {
  insufficient: { current: number; required: number } | null;
  shopOpen: boolean;
  openInsufficient: (current: number, required: number) => void;
  closeInsufficient: () => void;
  openShop: () => void;
  closeShop: () => void;
}

export function useLumenGate(): LumenGateState {
  const [insufficient, setInsufficient] = useState<{ current: number; required: number } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  const openInsufficient = useCallback((current: number, required: number) => {
    setInsufficient({ current, required });
  }, []);
  const closeInsufficient = useCallback(() => setInsufficient(null), []);
  const openShop = useCallback(() => setShopOpen(true), []);
  const closeShop = useCallback(() => setShopOpen(false), []);

  return { insufficient, shopOpen, openInsufficient, closeInsufficient, openShop, closeShop };
}
