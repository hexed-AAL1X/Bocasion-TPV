export type PrinterInfoLite = {
  name: string;
  displayName: string;
  /** Tipo / driver del dispositivo */
  description: string;
  /** Ubicación o dispositivo de conexión */
  portName: string;
  /** Comentario configurado por el usuario */
  comment: string;
  status: string;
  isDefault: boolean;
};
