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

/**
 * Shared visual shell for legacy nav tabs; each route owns state and action.
 * Paint lives in components-owner.css keyed by data-owner="tab-button":
 * the frozen .nav-tabs li a look applied to the rendered button/link element.
 */
export function TabButton({
  active = false,
  as,
  children,
  className,
  size = "default",
  ...rest
}: TabButtonProps) {
  const Component = as ?? "button";

  return (
    <li className={active ? "active" : undefined}>
      <Component {...rest} className={className} data-owner="tab-button">
        {children}
      </Component>
    </li>
  );
}
