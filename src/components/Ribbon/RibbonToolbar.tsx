import type { ReactNode } from "react";
import styles from "./Ribbon.module.css";

type Props = {
  children: ReactNode;
  entidades?: boolean;
};

/** Contenedor de cinta; la línea final la aporta el borde del último grupo. */
export function RibbonToolbar({ children, entidades }: Props) {
  return (
    <div className={entidades ? styles.toolbarEntidades : styles.toolbar}>
      {children}
    </div>
  );
}
