import { useEffect, useRef } from "react";
import Button from "./Button";
export default function LeaveProfileDialog({ blocker, busy, dirty }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="leave-dialog"
      aria-labelledby="leave-title"
      aria-describedby="leave-description"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = [
          ...ref.current.querySelectorAll("button:not(:disabled)"),
        ];
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        blocker.reset();
      }}
    >
      <h2 id="leave-title">
        {busy
          ? "Your profile is being saved"
          : dirty
            ? "Leave without saving?"
            : "Leave this page?"}
      </h2>
      <p id="leave-description">
        {busy
          ? "Wait for the save to finish before leaving this page."
          : dirty
            ? "Your unsaved changes will be lost if you leave this page."
            : "Your profile has been saved. You can return to it anytime."}
      </p>
      <div>
        <Button type="button" onClick={() => blocker.reset()} autoFocus>
          Keep editing
        </Button>
        {!busy ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => blocker.proceed()}
          >
            Leave page
          </Button>
        ) : null}
      </div>
    </dialog>
  );
}
