export type RegisterStatus = "Abierto" | "Cerrado";

export type PosRegister = {
  id: string;
  label: string;
  point: string;
  branch: string;
  openedAtTime: string;
};

export const DEFAULT_REGISTER_ID = "18786";

export const POS_REGISTERS: PosRegister[] = [
  { id: "18786", label: "ALICORP COPSA_CJA1", point: "ALICORP COPSA_CJA1", branch: "ALICORP COPSA", openedAtTime: "07:11 AM" },
  { id: "19034", label: "UPC SI_CJA3", point: "UPC SI_CJA3", branch: "UPC", openedAtTime: "06:35 AM" },
  { id: "19021", label: "UPC SM_CJA1", point: "UPC SM_CJA1", branch: "UPC", openedAtTime: "06:40 AM" },
  { id: "19022", label: "UPC MO_CJA2", point: "UPC MO_CJA2", branch: "UPC", openedAtTime: "06:42 AM" },
  { id: "19028", label: "UPN CJ_VTA2", point: "UPN CJ_VTA2", branch: "UPN", openedAtTime: "07:01 AM" },
  { id: "19031", label: "BEGO_CJA1", point: "BEGO_CJA1", branch: "BEGO", openedAtTime: "06:48 AM" },
  { id: "19035", label: "ALICORP_CJA1", point: "ALICORP_CJA1", branch: "ALICORP", openedAtTime: "06:52 AM" },
  { id: "19036", label: "UPC SI_CJA1", point: "UPC SI_CJA1", branch: "UPC", openedAtTime: "06:38 AM" },
  { id: "19037", label: "UPC SI_CJA2", point: "UPC SI_CJA2", branch: "UPC", openedAtTime: "06:39 AM" },
  { id: "19038", label: "UPC MO_CJA1", point: "UPC MO_CJA1", branch: "UPC", openedAtTime: "06:41 AM" },
];

export function getRegisterById(id: string): PosRegister | undefined {
  return POS_REGISTERS.find((register) => register.id === id);
}

export function getDefaultRegister(): PosRegister {
  return getRegisterById(DEFAULT_REGISTER_ID) ?? POS_REGISTERS[0];
}
