import type { CSSProperties, ElementType, ReactNode } from "react";
import { issueLabelStyle } from "../legacy-issue-label-style";

type IssueLabelOwnProps = {
  children: ReactNode;
  color?: string;
  labelId?: string | number | bigint;
  className?: string;
  style?: CSSProperties;
};

export type IssueLabelProps = IssueLabelOwnProps & {
  as?: ElementType;
  [property: string]: unknown;
};

/** Shared legacy issue-label paint and border contract. */
export function IssueLabel({
  as,
  children,
  color,
  labelId,
  className,
  style,
  ...rest
}: IssueLabelProps) {
  const Component = as ?? "span";
  const paint = issueLabelStyle(color);
  const mergedStyle: CSSProperties = {
    ...style,
    ...paint,
    border: 0,
    borderStyle: "none",
    borderWidth: 0,
  };

  return (
    <Component
      {...rest}
      className={`issue-label active${className ? ` ${className}` : ""}`}
      data-label-id={labelId == null ? undefined : String(labelId)}
      style={mergedStyle}
    >
      {children}
    </Component>
  );
}
