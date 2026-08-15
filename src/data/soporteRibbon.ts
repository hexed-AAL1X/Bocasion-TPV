import { imageUrl } from "../utils/assetUrl";
import type { AlmacenLargeAction } from "./almacenRibbon";

const icon = (file: string) => imageUrl(`iconos/${file}`);

export const soporteAcciones: AlmacenLargeAction[] = [
  { id: "registro", label: "Registro", image: icon("clientes-shell32-289.png") },
  { id: "ayuda", label: "Ayuda", image: icon("menu-shell32-46.png"), badge: "?" },
  { id: "comentarios", label: "Comentarios", image: icon("inbox-shell32-272.png") },
  { id: "contar-amigo", label: "Contarle a un amigo", image: icon("clientes-imageres-130.png") },
  { id: "videos", label: "Videos tutoriales", image: icon("menu-shell32-166.png") },
  { id: "faq", label: "FAQ", image: icon("clientes-imageres-101.png") },
  { id: "notas-version", label: "Notas de la versión", image: icon("activo-inbox.png") },
  { id: "acerca-de", label: "Acerca de", image: icon("menu-shell32-46.png"), badge: "i" },
];
