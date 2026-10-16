import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "icon";
}) {
  return (
    <button
      type="button"
      className={clsx("button", `button-${variant}`, className)}
      {...props}
    />
  );
}
