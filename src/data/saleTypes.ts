export type SaleTypeOption = {
  id: string;
  label: string;
  hint: string;
};

export const DEFAULT_SALE_TYPE = "Mercadería";

export const NORMAL_SALE_OPTION: SaleTypeOption = {
  id: "mercaderia",
  label: DEFAULT_SALE_TYPE,
  hint: "Venta habitual con cobro normal",
};

export const SPECIAL_SALE_OPTIONS: SaleTypeOption[] = [
  {
    id: "transf-gratuita",
    label: "Transf. gratuita",
    hint: "Transferencia sin cargo al cliente",
  },
];

export const ALL_SALE_TYPE_OPTIONS: SaleTypeOption[] = [
  NORMAL_SALE_OPTION,
  ...SPECIAL_SALE_OPTIONS,
];

export function isSpecialSaleType(type: string): boolean {
  return type !== DEFAULT_SALE_TYPE;
}
