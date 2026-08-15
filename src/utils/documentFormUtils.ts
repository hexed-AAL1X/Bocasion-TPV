import type { DocumentRecord } from "../data/documents";
import { nextDocumentCodigo } from "../data/documents";

export type DocumentFormValues = {
  codigo: string;
  nombre: string;
  registroCompra: boolean;
  ventaDirecta: boolean;
  codSunat: string;
};

export function emptyDocumentForm(existing: DocumentRecord[]): DocumentFormValues {
  return {
    codigo: nextDocumentCodigo(existing),
    nombre: "",
    registroCompra: false,
    ventaDirecta: false,
    codSunat: "00",
  };
}

export function documentRecordToForm(record: DocumentRecord): DocumentFormValues {
  return {
    codigo: record.codigo,
    nombre: record.nombre,
    registroCompra: record.registroCompra,
    ventaDirecta: record.ventaDirecta,
    codSunat: record.codSunat,
  };
}

export function documentFormToRecord(values: DocumentFormValues, existing?: DocumentRecord): DocumentRecord {
  return {
    id: existing?.id ?? `doc-${Date.now()}`,
    codigo: values.codigo.trim(),
    nombre: values.nombre.trim().toUpperCase(),
    registroCompra: values.registroCompra,
    ventaDirecta: values.ventaDirecta,
    codSunat: values.codSunat || "00",
  };
}
