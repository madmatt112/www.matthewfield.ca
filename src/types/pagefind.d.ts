declare module "@pagefind/default-ui" {
  export interface PagefindUIResult {
    url: string;
    [key: string]: unknown;
  }
  export interface PagefindUIOptions {
    element: HTMLElement | string;
    bundlePath?: string;
    showImages?: boolean;
    excerptLength?: number;
    processResult?: (r: PagefindUIResult) => PagefindUIResult | null;
    [key: string]: unknown;
  }
  export class PagefindUI {
    constructor(opts: PagefindUIOptions);
  }
}
