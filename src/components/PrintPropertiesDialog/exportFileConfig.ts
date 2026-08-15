import type { ComponentType } from "react";
import {
  DbfActionIcon,
  ExcelActionIcon,
  HtmlActionIcon,
  JpgActionIcon,
  PdfActionIcon,
  PngActionIcon,
  TxtActionIcon,
  WordActionIcon,
} from "./printDialogIcons";

export type ExportFileKind =
  | "excel"
  | "word"
  | "dbf"
  | "txtData"
  | "jpg"
  | "png"
  | "pdf"
  | "html"
  | "txt";

export const EXPORT_SUBFOLDERS: Record<ExportFileKind, string> = {
  excel: "XLS",
  word: "DOC",
  dbf: "DBF",
  txtData: "TXT",
  txt: "TXT",
  jpg: "JPG",
  png: "PNG",
  pdf: "PDF",
  html: "HTML",
};

type ExportFileConfig = {
  title: string;
  menuLabel: string;
  extension: string;
  Icon: ComponentType<{ size?: number }>;
};

export const EXPORT_FILE_CONFIG: Record<ExportFileKind, ExportFileConfig> = {
  excel: {
    title: "Exportar a Excel",
    menuLabel: "Excel",
    extension: ".xls",
    Icon: ExcelActionIcon,
  },
  word: {
    title: "Exportar a MS-Word",
    menuLabel: "MS-Word",
    extension: ".doc",
    Icon: WordActionIcon,
  },
  dbf: {
    title: "Exportar a DBF",
    menuLabel: "DBF",
    extension: ".dbf",
    Icon: DbfActionIcon,
  },
  txtData: {
    title: "Exportar a TXT (DATA)",
    menuLabel: "TXT (DATA)",
    extension: ".txt",
    Icon: TxtActionIcon,
  },
  txt: {
    title: "Exportar a Archivo (TXT)",
    menuLabel: "Archivo (TXT)",
    extension: ".txt",
    Icon: TxtActionIcon,
  },
  pdf: {
    title: "Exportar a PDF",
    menuLabel: "PDF",
    extension: ".pdf",
    Icon: PdfActionIcon,
  },
  html: {
    title: "Exportar a HTML",
    menuLabel: "HTML",
    extension: ".html",
    Icon: HtmlActionIcon,
  },
  jpg: {
    title: "Exportar a JPG Imagen",
    menuLabel: "JPG Imagen",
    extension: ".jpg",
    Icon: JpgActionIcon,
  },
  png: {
    title: "Exportar a PNG Imagen",
    menuLabel: "PNG Imagen",
    extension: ".png",
    Icon: PngActionIcon,
  },
};

/** Opciones del menú desplegable (Excel va en el botón principal). */
export const EXPORT_DROPDOWN_KINDS: ExportFileKind[] = ["word", "dbf", "txtData", "jpg", "png"];
