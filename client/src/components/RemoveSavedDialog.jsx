import { useLanguage } from "../i18n/useLanguage";
import { useEffect, useRef } from "react";
import Button from "./Button";
export default function RemoveSavedDialog({
  entry,
  busy,
  onCancel,
  onConfirm,
}) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const previousFocus = useRef(document.activeElement);
  function cancel() {
    ref.current.close();
    onCancel();
    requestAnimationFrame(() => {
      if (previousFocus.current?.isConnected)
        previousFocus.current.focus({
          preventScroll: true,
        });
    });
  }
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="leave-dialog readiness-remove-dialog"
      aria-labelledby="remove-title"
      aria-describedby="remove-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) cancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = [
            ...ref.current.querySelectorAll("button:not(:disabled)"),
          ],
          first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <h2 id="remove-title">
        {t("Remove {0} from your list?", [entry.acronym])}
      </h2>
      <p id="remove-description">
        {t(
          "This removes this scheme\u2019s saved checklist progress. You can save the scheme again and start with an empty checklist.",
        )}
      </p>
      <div>
        <Button
          type="button"
          variant="secondary"
          autoFocus
          disabled={busy}
          onClick={cancel}
        >
          {t("Keep scheme")}
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={busy}
          onClick={onConfirm}
        >
          {t("Remove saved scheme")}
        </Button>
      </div>
    </dialog>
  );
}
