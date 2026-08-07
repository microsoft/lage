import React, {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
} from "react";

import styles from "./styles.module.css";

interface DiagramZoomProps {
  children: ReactNode;
}

export default function DiagramZoom({ children }: DiagramZoomProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDialog = (): void => {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  };

  const openDialog = (): void => {
    dialogRef.current?.showModal();
    requestAnimationFrame(() =>
      dialogRef.current?.querySelector("button")?.focus(),
    );
  };

  const closeFromBackdrop = (event: MouseEvent<HTMLDialogElement>): void => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  const closeFromCancel = (event: FormEvent<HTMLDialogElement>): void => {
    event.preventDefault();
    closeDialog();
  };

  return (
    <>
      <div className={styles.preview}>
        {children}
        <button
          ref={triggerRef}
          className="button button--secondary button--sm"
          type="button"
          onClick={openDialog}
        >
          View full size
        </button>
      </div>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="Full-size server-worker diagram"
        onCancel={closeFromCancel}
        onClick={closeFromBackdrop}
      >
        <div className={styles.dialogContent}>
          <div className={styles.toolbar}>
            <button
              className="button button--secondary button--sm"
              type="button"
              onClick={closeDialog}
            >
              Close
            </button>
          </div>
          <div className={styles.fullSize}>{children}</div>
        </div>
      </dialog>
    </>
  );
}
