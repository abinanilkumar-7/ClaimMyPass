declare module "@cashfreepayments/cashfree-js" {
  export type CashfreeMode = "sandbox" | "production";

  export type CashfreeRedirectTarget =
    | "_self"
    | "_blank"
    | "_top"
    | "_modal";

  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: CashfreeRedirectTarget;
  }

  export interface Cashfree {
    checkout(
      options: CashfreeCheckoutOptions
    ): Promise<unknown>;
  }

  export function load(options: {
    mode: CashfreeMode;
  }): Promise<Cashfree | null>;
}
