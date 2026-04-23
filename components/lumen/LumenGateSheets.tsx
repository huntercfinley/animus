import { InsufficientLumenSheet } from './InsufficientLumenSheet';
import { LumenShop } from './LumenShop';
import type { LumenAction } from '@/hooks/useLumen';
import type { LumenGateState } from '@/hooks/useLumenGate';

interface Props {
  gate: LumenGateState;
  action: LumenAction;
  onAdCredited?: () => void;
}

export function LumenGateSheets({ gate, action, onAdCredited }: Props) {
  return (
    <>
      <InsufficientLumenSheet
        visible={!!gate.insufficient}
        current={gate.insufficient?.current ?? 0}
        required={gate.insufficient?.required ?? 0}
        action={action}
        onClose={gate.closeInsufficient}
        onAdCredited={onAdCredited}
        onBuyLumen={gate.openShop}
      />
      <LumenShop visible={gate.shopOpen} onClose={gate.closeShop} />
    </>
  );
}
