declare module 'upng-js' {
  interface DecodedAPNGFrame {
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    delay: number;
    dispose: number;
    blend: number;
    data: Uint8Array;
  }

  interface DecodedPNG {
    width: number;
    height: number;
    tabs: {
      acTL?: {
        num_frames: number;
        num_plays: number;
      };
    };
    frames: DecodedAPNGFrame[];
  }

  const UPNG: {
    decode: (buffer: ArrayBuffer) => DecodedPNG;
    toRGBA8: (decoded: DecodedPNG) => Array<ArrayBuffer>;
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
