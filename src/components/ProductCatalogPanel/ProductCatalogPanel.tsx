import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getProductGroups,
  productsByGroup,
  type Product,
} from "../../data/productCatalog";
import styles from "./ProductCatalogPanel.module.css";

const CATEGORY_PAGE_SIZE = 7;
const PRODUCT_COLS = 14;
const PRODUCT_ROWS = 4;
const PRODUCT_PAGE_SIZE = PRODUCT_COLS * PRODUCT_ROWS;

type SlideDir = "left" | "right";

function useRepeatingPress(onPress: () => void, disabled = false) {
  const onPressRef = useRef(onPress);
  useEffect(() => { onPressRef.current = onPress; }, [onPress]);

  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    if (repeatRef.current) clearInterval(repeatRef.current);
  }, []);

  const stop = useCallback(() => {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
    if (repeatRef.current) { clearInterval(repeatRef.current); repeatRef.current = null; }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onPressRef.current();
    holdRef.current = setTimeout(() => {
      let speed = 150;
      const fire = () => {
        onPressRef.current();
        speed = Math.max(60, speed - 12);
        repeatRef.current = setTimeout(fire, speed) as unknown as ReturnType<typeof setInterval>;
      };
      repeatRef.current = setTimeout(fire, speed) as unknown as ReturnType<typeof setInterval>;
    }, 420);
  }, [disabled]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (_e: React.MouseEvent) => {},
  };
}

type Props = {
  disabled?: boolean;
  onSelectProduct: (product: Product) => void;
};

function NavArrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}

export function ProductCatalogPanel({ disabled = false, onSelectProduct }: Props) {
  const groups = useMemo(() => getProductGroups(), []);
  const [groupIdx, setGroupIdx] = useState(0);
  const [catStartIdx, setCatStartIdx] = useState(0);
  const [prodPage, setProdPage] = useState(0);
  const [slideDir, setSlideDir] = useState<SlideDir>("right");
  const [gridKey, setGridKey] = useState(0);
  const [catSlideDir, setCatSlideDir] = useState<SlideDir>("right");
  const [catKey, setCatKey] = useState(0);

  const selectedGroup = groups[groupIdx] ?? groups[0] ?? "";
  const products = useMemo(
    () => (selectedGroup ? productsByGroup(selectedGroup) : []),
    [selectedGroup],
  );

  const maxCatStart = Math.max(0, groups.length - CATEGORY_PAGE_SIZE);
  const prodPageCount = Math.max(1, Math.ceil(products.length / PRODUCT_PAGE_SIZE));

  const visibleGroups = groups.slice(catStartIdx, catStartIdx + CATEGORY_PAGE_SIZE);

  const visibleProducts = products.slice(
    prodPage * PRODUCT_PAGE_SIZE,
    prodPage * PRODUCT_PAGE_SIZE + PRODUCT_PAGE_SIZE,
  );

  const gridSlots = useMemo(() => {
    const slots: (Product | null)[] = visibleProducts.map((p) => p);
    while (slots.length < PRODUCT_PAGE_SIZE) {
      slots.push(null);
    }
    return slots;
  }, [visibleProducts]);

  const bumpGrid = useCallback((dir: SlideDir) => {
    setSlideDir(dir);
    setGridKey((k) => k + 1);
  }, []);

  const bumpCat = useCallback((dir: SlideDir) => {
    setCatSlideDir(dir);
    setCatKey((k) => k + 1);
  }, []);

  const selectGroup = useCallback((idx: number) => {
    const dir: SlideDir = idx > groupIdx ? "right" : "left";
    bumpGrid(dir);
    setGroupIdx(idx);
    setProdPage(0);
    setCatStartIdx((start) => {
      if (idx < start) return idx;
      if (idx >= start + CATEGORY_PAGE_SIZE) return idx - CATEGORY_PAGE_SIZE + 1;
      return start;
    });
  }, [groupIdx, bumpGrid]);

  const doCatPrev = useCallback(() => {
    if (catStartIdx <= 0) return;
    bumpCat("left");
    setCatStartIdx((s) => Math.max(0, s - 1));
  }, [bumpCat, catStartIdx]);

  const doCatNext = useCallback(() => {
    if (catStartIdx >= maxCatStart) return;
    bumpCat("right");
    setCatStartIdx((s) => Math.min(maxCatStart, s + 1));
  }, [bumpCat, catStartIdx, maxCatStart]);
  const doProdPrev = useCallback(() => { bumpGrid("left"); setProdPage((p) => Math.max(0, p - 1)); }, [bumpGrid]);
  const doProdNext = useCallback(() => { bumpGrid("right"); setProdPage((p) => Math.min(prodPageCount - 1, p + 1)); }, [bumpGrid, prodPageCount]);

  const catPrevProps = useRepeatingPress(doCatPrev, catStartIdx <= 0);
  const catNextProps = useRepeatingPress(doCatNext, catStartIdx >= maxCatStart);
  const prodPrevProps = useRepeatingPress(doProdPrev, prodPage <= 0);
  const prodNextProps = useRepeatingPress(doProdNext, prodPage >= prodPageCount - 1);

  const handleProductClick = useCallback(
    (product: Product) => {
      if (disabled) return;
      onSelectProduct(product);
    },
    [disabled, onSelectProduct],
  );

  useEffect(() => {
    if (catStartIdx > maxCatStart) {
      setCatStartIdx(maxCatStart);
    }
  }, [catStartIdx, maxCatStart]);

  useEffect(() => {
    if (prodPage >= prodPageCount) {
      setProdPage(Math.max(0, prodPageCount - 1));
    }
  }, [prodPage, prodPageCount]);

  return (
    <section className={styles.panel} aria-label="Catálogo de productos">
      <div className={styles.categoryRow}>
        <button
          type="button"
          className={styles.catNavBtn}
          disabled={catStartIdx <= 0}
          aria-label="Grupos anteriores"
          {...catPrevProps}
        >
          <NavArrow direction="left" />
        </button>

        <div
          key={catKey}
          className={`${styles.categoryTabs} ${catSlideDir === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
        >
          {visibleGroups.map((group) => {
            const idx = groups.indexOf(group);
            return (
              <button
                key={group}
                type="button"
                className={[
                  styles.categoryBtn,
                  idx === groupIdx ? styles.categoryBtnActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectGroup(idx)}
                title={group}
              >
                {group}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.catNavBtn}
          disabled={catStartIdx >= maxCatStart}
          aria-label="Grupos siguientes"
          {...catNextProps}
        >
          <NavArrow direction="right" />
        </button>
      </div>

      {disabled && (
        <p className={styles.lockedMsg}>
          Ingrese un DNI/RUC válido antes de agregar productos.
        </p>
      )}

      <div className={styles.body}>
        <div
          key={gridKey}
          className={`${styles.productGrid} ${slideDir === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
        >
          {gridSlots.map((product, i) =>
            product ? (
              <button
                key={product.code}
                type="button"
                style={{ animationDelay: `${Math.floor(i / PRODUCT_COLS) * 40}ms` }}
                className={styles.productBtn}
                disabled={disabled}
                onClick={() => handleProductClick(product)}
                title={`${product.description} (${product.code})`}
              >
                <span className={styles.productName}>{product.description}</span>
              </button>
            ) : (
              <div key={`empty-${i}`} className={`${styles.productBtn} ${styles.productBtnEmpty}`} />
            ),
          )}
        </div>

        <div className={styles.productNav}>
          <button
            type="button"
            className={styles.prodNavBtn}
            disabled={prodPage <= 0}
            aria-label="Productos anteriores"
            {...prodPrevProps}
          >
            <NavArrow direction="left" />
          </button>
          {prodPageCount > 1 && (
            <span className={styles.prodPageIndicator}>
              {prodPage + 1} / {prodPageCount}
            </span>
          )}
          <button
            type="button"
            className={styles.prodNavBtn}
            disabled={prodPage >= prodPageCount - 1}
            aria-label="Productos siguientes"
            {...prodNextProps}
          >
            <NavArrow direction="right" />
          </button>
        </div>
      </div>
    </section>
  );
}
