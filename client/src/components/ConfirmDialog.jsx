import { useEffect, useRef } from "react";
import Button from "./Button";
import { useLanguage } from "../i18n/useLanguage";
export default function ConfirmDialog({
  title,
  children,
  busy,
  onCancel,
  onConfirm,
}) {
  const ref = useRef(null),
    previous = useRef(document.activeElement),
    { t } = useLanguage();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous.current?.isConnected)
        previous.current.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="leave-dialog"
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{t(title)}</h2>
      <div>{children}</div>
      <div className="organizer-actions">
        <Button
          variant="secondary"
          autoFocus
          disabled={busy}
          onClick={onCancel}
        >
          {t("Cancel")}
        </Button>
        <Button variant="danger" loading={busy} onClick={onConfirm}>
          {t("Confirm removal")}
        </Button>
      </div>
    </dialog>
  );
}
