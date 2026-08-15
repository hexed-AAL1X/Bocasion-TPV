import { useMemo } from "react";
import { getDefaultRegister, getRegisterById } from "../../data/posRegisters";
import { formatSaleDateLabel, getActiveRegisterId } from "../../services/salesSession";
import { DocsAnnexDialog } from "./DocsAnnexDialog";

type Props = {
  onClose: () => void;
};

export function DocsAnnexPaymentEditDialog({ onClose }: Props) {
  const registerId = getActiveRegisterId();
  const register = useMemo(
    () => getRegisterById(registerId) ?? getDefaultRegister(),
    [registerId],
  );
  const saleDate = formatSaleDateLabel(new Date());

  return (
    <DocsAnnexDialog
      mode="payment-edit"
      registerId={registerId}
      registerLabel={register.label}
      registerPoint={register.point}
      saleDate={saleDate}
      onClose={onClose}
    />
  );
}
