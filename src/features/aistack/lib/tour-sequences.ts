/**
 * Ordered walk through the stack, roughly in canonical stage order:
 * raw materials → chemicals → wafers → equipment → eda → design →
 * fabrication → memory → assembly → datacenter → power.
 *
 * Node ids here must exist in src/content/nodes/; the build script would
 * surface a dangling reference at runtime rather than here, so keep this
 * list aligned with the node files.
 */
export const mainTour: readonly string[] = [
  "spruce-pine",
  "wacker-burghausen",
  "shin-etsu-shirakawa",
  "asml-veldhoven",
  "applied-materials-santa-clara",
  "arm-cambridge",
  "nvidia-santa-clara",
  "tsmc-hsinchu",
  "tsmc-arizona",
  "sk-hynix-icheon",
  "foxconn-zhengzhou",
  "ashburn-dc-alley",
  "three-mile-island",
];
