import * as stylex from "@stylexjs/stylex";
import type { ElementType, ReactNode } from "react";

type TabButtonOwnProps = {
  active?: boolean;
  children: ReactNode;
  className?: string;
  size?: "default" | "small";
};

export type TabButtonProps = TabButtonOwnProps & {
  as?: ElementType;
  [property: string]: unknown;
};

const styles = stylex.create({
  action: {
    appearance: "none",
    backgroundColor: "transparent",
    border: "1px solid transparent",
    borderRadius: "4px 4px 0 0",
    color: "#3592b5",
    cursor: "pointer",
    display: "block",
    font: "inherit",
    fontWeight: "bold",
    lineHeight: "20px",
    marginRight: "2px",
    padding: "8px 30px",
    textDecoration: "none",
    ":hover": {
      backgroundColor: "#f2f2f2",
      borderColor: "#eee #eee #ddd",
      textDecoration: "none",
    },
    "@media (max-width: 720px)": {
      paddingLeft: "5px",
      paddingRight: "5px",
    },
  },
  active: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderBottomColor: "transparent",
    color: "#555",
    cursor: "default",
  },
  small: {
    padding: "4px 15px",
  },
});

/** Shared visual shell for legacy nav tabs; each route owns state and action. */
export function TabButton({
  active = false,
  as,
  children,
  className,
  size = "default",
  ...rest
}: TabButtonProps) {
  const Component = as ?? "button";
  const actionProps = stylex.props(
    styles.action,
    size === "small" && styles.small,
    active && styles.active,
  );

  return (
    <li className={active ? "active" : undefined}>
      <Component
        {...rest}
        {...actionProps}
        className={`${actionProps.className ?? ""}${className ? ` ${className}` : ""}`.trim()}
      >
        {children}
      </Component>
    </li>
  );
}
