"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Panel({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  modal = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  modal?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={
            modal
              ? "dialog-content modal-content"
              : "dialog-content drawer-content"
          }
          aria-describedby={undefined}
          onInteractOutside={(event) => {
            event.preventDefault();
          }}
        >
          <header className="dialog-header">
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <Dialog.Title>{title}</Dialog.Title>
            </div>
            <Dialog.Close
              className="button button-icon"
              aria-label="Close panel"
            >
              <X size={20} />
            </Dialog.Close>
          </header>
          <div className="dialog-body">{children}</div>
          {footer && <footer className="dialog-footer">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
