import type { ReactElement, ReactNode } from "react";

// NxImage is provided by nexus-runtime-test and can be imported from
// @pc-nexus/react after the runtime package containing it is released.
export interface NxImageProps {
  src: string;
  alt?: string;
  fit?: "cover" | "contain";
  height?: number;
  background?: boolean;
  opacity?: number;
  verticalAlign?: "top" | "center" | "bottom";
  className?: string;
  children?: ReactNode;
}

export const NxImage = "nx-image" as unknown as (props: NxImageProps) => ReactElement;
