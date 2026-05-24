declare module 'upng-js' {
  const UPNG: {
    encode: (
      imgs: Array<ArrayBuffer>,
      width: number,
      height: number,
      colors: number,
      delays?: number[]
    ) => ArrayBuffer;
  };

  export default UPNG;
}
