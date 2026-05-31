import { copyFileSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const SOURCE_SVG_PATH =
  process.env.HOMEPAGE_REFERENCE_SVG ??
  "/Users/robertwilliams/Downloads/attachments/city_lineart_preserved_sketch_no_bg_no_signature.svg";

const WIDTH = 1672;
const HEIGHT = 941;
const BASE_OUTPUT_PATH = join(process.cwd(), "public/homepage-reference-sketch-base.svg");
const LIVE_OUTPUT_PATH = join(process.cwd(), "public/homepage-reference-sketch.svg");

function assertSourceLooksRight(svg: string) {
  if (!svg.includes("<svg")) {
    throw new Error("Homepage reference source must be an SVG file");
  }

  if (!svg.includes(`viewBox="0 0 ${WIDTH} ${HEIGHT}"`)) {
    throw new Error(`Homepage reference source must use viewBox 0 0 ${WIDTH} ${HEIGHT}`);
  }
}

function main() {
  const svg = readFileSync(SOURCE_SVG_PATH, "utf8");
  assertSourceLooksRight(svg);

  copyFileSync(SOURCE_SVG_PATH, BASE_OUTPUT_PATH);
  copyFileSync(SOURCE_SVG_PATH, LIVE_OUTPUT_PATH);

  console.log(
    `Copied ${basename(SOURCE_SVG_PATH)} to ${BASE_OUTPUT_PATH} and ${LIVE_OUTPUT_PATH}`,
  );
}

main();
