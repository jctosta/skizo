// Type stubs for the Link components that `skizo export --router` imports, so the export type-check
// needs neither Next.js nor React Router. Each stub requires the prop that takes the path.

declare module "next/link" {
  import type { AnchorHTMLAttributes, ReactElement } from "react";
  export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }): ReactElement;
}

declare module "react-router" {
  import type { AnchorHTMLAttributes, ReactElement } from "react";
  export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }): ReactElement;
}
