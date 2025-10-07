// Allow custom intrinsic JSX elements used by weather scenes (e.g., x, sky, trees)
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}


