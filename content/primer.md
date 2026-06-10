# The Physical AI Stack: A Comprehensive Primer

> A foundational reference covering how AI compute is built — from the physics of transistors and EUV light, through GPUs, memory, networking, and racks, up to gigawatt data centers and the supply chain underneath them. Built as a learning document to be read sequentially or referenced by section.

---

## Table of Contents

1. [The Physical AI Stack](#1-the-physical-ai-stack)
2. [Why GPUs Won](#2-why-gpus-won)
3. [Semiconductor Fundamentals](#3-semiconductor-fundamentals)
4. [Lithography: ASML and the EUV Bottleneck](#4-lithography-asml-and-the-euv-bottleneck)
5. [The Foundry Ecosystem](#5-the-foundry-ecosystem)
6. [Memory: HBM and the Bandwidth Wall](#6-memory-hbm-and-the-bandwidth-wall)
7. [Advanced Packaging: CoWoS and the Critical Choke Point](#7-advanced-packaging-cowos-and-the-critical-choke-point)
8. [Inside a Modern AI GPU](#8-inside-a-modern-ai-gpu)
9. [The Chip Designers](#9-the-chip-designers)
10. [Networking: Scale-Up vs. Scale-Out](#10-networking-scale-up-vs-scale-out)
11. [The Rack and the Pod](#11-the-rack-and-the-pod)
12. [The Datacenter as a Computer](#12-the-datacenter-as-a-computer)
13. [Power: The Gigawatt Problem](#13-power-the-gigawatt-problem)
14. [Cooling at Scale](#14-cooling-at-scale)
15. [Site Selection and Geography](#15-site-selection-and-geography)
16. [Hyperscalers, Neoclouds, and the Customer Stack](#16-hyperscalers-neoclouds-and-the-customer-stack)
17. [The Software Stack and CUDA's Moat](#17-the-software-stack-and-cudas-moat)
18. [Capex and Compute Economics](#18-capex-and-compute-economics)
19. [Supply Chain Geopolitics](#19-supply-chain-geopolitics)
20. [Bottlenecks and the Forward View](#20-bottlenecks-and-the-forward-view)
21. [Key Concepts Glossary](#21-key-concepts-glossary)
22. [Appendix: Major Players](#22-appendix-major-players)

---

## 1. The Physical AI Stack

The AI buildout is the largest concentrated industrial expansion of the 21st century. It runs through roughly seven physical layers, each gated by a different set of constraints, suppliers, and physics.

### The Seven Layers

**1. Atoms** — Silicon wafers, photoresist chemistry, ultrapure gases, and the rare materials (cobalt, ruthenium, hafnium, neon) that make modern transistors possible.

**2. Lithography** — Machines that print circuit patterns onto silicon at near-atomic resolution. The leading-edge step is dominated by a single Dutch company (ASML).

**3. Foundries** — Plants that turn blank wafers into finished dies. Roughly 90% of leading-edge logic comes from a single Taiwanese company (TSMC).

**4. Memory and Packaging** — High-Bandwidth Memory (HBM) stacks and the advanced packaging (CoWoS) that fuses logic dies, memory, and interconnect into a single chip.

**5. Accelerators and Networking** — GPUs and custom ASICs, plus the high-bandwidth interconnects (NVLink, InfiniBand, Ethernet) that turn thousands of chips into one logical machine.

**6. Racks and Datacenters** — Power distribution, liquid cooling, real estate, and the physical buildings holding 100,000+ GPUs.

**7. Power and Site** — Substations, transmission, water rights, and the regional grids that determine where all this can actually be built.

### The Layered View Matters Because Bottlenecks Cascade

Each layer is gated by the one below it. You can have all the GPU orders in the world, but if TSMC's advanced packaging line is full, you don't get chips. You can have all the chips, but if there's no power, the racks sit dark. You can have power, but if the grid interconnect approval takes seven years, the project doesn't pencil. Whichever layer is tightest sets the pace for everything above it.

Right now (early 2026) the binding constraints are advanced packaging (CoWoS), high-end memory (HBM4), and grid power — in that order, and shifting. A year ago it was just CoWoS and HBM. A year from now it will probably be power and transmission.

### A Key Insight About AI Compute

A modern AI cluster is not a collection of computers. It is one computer, distributed across tens of thousands of chips, with the network fabric acting as its internal bus. The training run that produces a frontier model is a single program executing across that whole machine for months at a time. This is why bandwidth, latency, and reliability *between* chips matter as much as the chips themselves — and why the rack and the datacenter have become the new unit of design, not the server.

---

## 2. Why GPUs Won

### The Architectural Mismatch

CPUs are optimized for *sequential* work — running one thread of logic as fast as possible, with deep caches and branch prediction to keep the pipeline full. They have a small number of very smart cores (4–128 typically).

Modern AI workloads are the opposite. Training and inference are dominated by matrix multiplication — millions of small, identical, independent arithmetic operations. The bottleneck isn't logic; it's throughput.

GPUs were originally built for graphics, which has the same shape: each pixel is independent, and the same operation runs across millions of them. A GPU is essentially a wide, shallow processor — thousands of small cores running the same instruction in parallel. The architectural term is **SIMD** (Single Instruction, Multiple Data). This turned out to be the right shape for neural networks.

### The Tensor Core

NVIDIA introduced **tensor cores** in 2017 (Volta architecture). These are specialized circuits that compute matrix multiplications natively — a 4x4 multiply-accumulate as a single instruction. Each subsequent generation has roughly doubled tensor core throughput while reducing precision (FP32 → FP16 → BF16 → FP8 → FP4 → FP6 hybrid formats).

Lower precision is a key lever. Neural networks are remarkably tolerant of numerical imprecision — you can train and infer in 8-bit or 4-bit floats with minimal accuracy loss, and you get 2–4x more throughput and bandwidth efficiency for free. This is one of the major reasons recent generations have advanced so quickly: it's not just transistor density, it's that the same transistors now do useful work at a quarter of the bit width.

### Why Not CPUs?

A modern Xeon has ~50 cores running at ~3 GHz. A modern GPU has ~20,000 cores running at ~2 GHz. For matrix-heavy workloads, the GPU is roughly two orders of magnitude faster — and the gap widens with each generation because GPU vendors prioritize parallel compute while CPU vendors balance many other concerns (single-thread speed, cache, security, virtualization).

The world has effectively settled on a division of labor: CPUs orchestrate the data and dispatch work; GPUs (or other accelerators) do the math.

### Why Not Other Accelerators?

CPUs and GPUs aren't the only options. There are specialized AI chips from Google (TPU), Amazon (Trainium), Microsoft (Maia), Meta (MTIA), and many startups (Cerebras, Groq, SambaNova). Some are very good. But NVIDIA had a 5-year head start in software (CUDA), a reference design every researcher already used, and a chip that was dominant in *both* training and inference. By the time custom silicon caught up architecturally, the software ecosystem was deeply entrenched. (See Section 17 on the CUDA moat.)

### The Reticle Limit

Modern AI chips have run into a physical wall. The lithography tools used to print circuits can only project a pattern of a certain maximum size — about 858 mm² (roughly 26mm × 33mm). This is the **reticle limit**, set by the size of the photomask and the lens system.

NVIDIA's Hopper (H100) was already near this limit at ~814 mm². Blackwell (B200) crosses it by bonding *two* reticle-sized dies into one logical GPU. Rubin Ultra (2027) is expected to integrate four reticle-sized dies. You can't make a single die bigger; you have to package multiple dies together, which is where advanced packaging becomes critical (Section 7).

---

## 3. Semiconductor Fundamentals

### Transistors as Switches

A transistor is a switch, and modern chips are built from billions of them. Apply voltage to one terminal (the gate), and current can flow between the other two (source and drain). A 0 or 1 is just whether the switch is on or off, and arithmetic is built up from layered combinations of switches.

The exponential improvement in computing over six decades has been driven by making transistors smaller. Smaller transistors are faster (electrons travel less distance), use less power (less capacitance to charge), and let you fit more on a chip (more arithmetic per cycle). This is what Moore's Law described.

### Process Nodes — The Numbers Are Marketing

A "process node" is a generation of manufacturing technology. Historically, the node name (90nm, 45nm, 22nm) referred to a real physical dimension — typically the gate length. That stopped being true around the 22nm node. Today's "3nm" or "2nm" labels are marketing names; no physical feature on a 3nm chip is actually 3nm wide. The smallest features are around 12–18nm.

What the node names *do* indicate is generational improvement: roughly 15–30% better performance, 25–35% better power efficiency, and 1.5–2x higher transistor density per node. The naming is a lossy indicator, but the underlying progress is real.

### Current State of the Art

| Node | Typical Use | Status (early 2026) |
|------|-------------|--------------------|
| 7nm | Older AI chips, mainstream server CPUs | Mature, high yields |
| 5nm | Hopper-era AI (H100), current iPhones | Mature |
| 4nm | Blackwell (B200/B300) | High volume |
| 3nm (N3) | Rubin GPUs, latest Apple silicon | Production |
| 2nm (N2) | Apple A20/M-series (2026), Rubin successors | Risk production → ramp |
| 1.4nm (A14) | Future leading edge | Development, ~2027–28 |

### FinFET to Gate-All-Around

Around the 22nm node, traditional flat (planar) transistors stopped scaling — leakage currents got too high. The industry switched to **FinFET** transistors, where the channel is a 3D fin standing up off the silicon, with the gate wrapping three sides.

Around the 3nm node, FinFETs in turn started running out of road. The next architecture is **Gate-All-Around (GAA)** — also called nanosheet — where the channel is a stack of horizontal sheets fully surrounded by the gate. Samsung shipped GAA first at their 3nm node (with mixed success). TSMC introduces GAA at 2nm (N2). Intel uses it at 18A/2nm.

### Yield Is Everything

A modern chip has tens of billions of transistors. If even one is defective, the chip might not work. Real wafers always have defects — random contamination, lithography errors, etching variation. The fraction of good chips per wafer is the **yield**.

A 300mm wafer of 5nm chips might cost $15,000–$20,000 to produce. If yield is 70% on a 600mm² die (you get ~90 good chips per wafer), each die costs ~$200. If yield drops to 40% (37 good chips), each die costs ~$500. This is why yield improvements matter so much — they directly dropwafer through to bottom-line economics.

### Moore's Law Is Slowing

The pace of node transitions has stretched from ~2 years to ~3+ years. Cost per transistor has roughly stopped declining at the leading edge — newer nodes are denser, but they're also so expensive that the cost-per-transistor curve has flattened. This is sometimes called the end of "Dennard scaling" (the corollary to Moore's Law about power scaling) — and it pushes the industry toward architectural cleverness (specialized accelerators, advanced packaging, lower precision math) rather than pure shrink.

---

## 4. Lithography: ASML and the EUV Bottleneck

### The Basic Problem

To make a chip, you have to draw circuits on silicon. The drawing instrument is light. You shine light through a patterned mask onto a silicon wafer coated in photosensitive chemicals (photoresist). Where light hits, chemistry happens; where it doesn't, no chemistry. After many such steps — etching, depositing, doping — the result is a working chip.

The resolution of the pattern is fundamentally limited by the wavelength of the light. Shorter wavelengths print smaller features.

### From DUV to EUV

For decades, the industry used **deep ultraviolet (DUV)** light — wavelength 193nm — generated by argon-fluoride excimer lasers. To get below ~22nm features with 193nm light, foundries used clever tricks like immersion lithography (water under the lens to bend light differently) and multi-patterning (printing the same layer twice with offsets). These tricks became increasingly expensive and slow.

The breakthrough was **extreme ultraviolet (EUV)** at 13.5nm — about 14 times shorter wavelength than DUV. EUV reaches feature sizes that DUV can only achieve through very expensive multi-patterning. This is the technology that enabled 7nm and below.

### Why EUV Is Hard

13.5nm light is absorbed by *everything* — including air, glass, and water. So an EUV machine has to:

- **Generate the light**: Drop tin droplets into a vacuum chamber 50,000 times per second. Hit each droplet with a high-power CO2 laser pulse, vaporizing it into a plasma that emits 13.5nm photons. Convert that plasma emission to a usable beam. Total wall-plug efficiency: ~3%.
- **Operate in vacuum**: The whole light path must be in vacuum because air absorbs EUV.
- **Use mirrors, not lenses**: Lenses would absorb EUV. Instead, use multilayer Bragg mirrors — alternating molybdenum and silicon layers, dozens of layers thick, polished to atomic flatness. Each mirror reflects ~70% of EUV. With 10 mirrors in series, you lose >95% of your light.
- **Project a perfect pattern**: The mask is also reflective (not transmissive), and is held in place with picometer precision while the wafer below is scanned.

Each of these is a Nobel-tier engineering problem. Doing all of them at once, reliably, in production, is why EUV took 30+ years and ~$10 billion of R&D to commercialize.

### ASML's Monopoly

There is exactly one company that makes EUV lithography machines: **ASML** of the Netherlands. Two key acquisitions made the monopoly: Cymer (2013, the laser/light source) and Hermes Microvision (e-beam inspection). Their core mirror supplier is Zeiss SMT in Germany. Their tin droplet generation is proprietary. No competitor is close.

A standard EUV machine (NXE:3800E) costs ~$200M, weighs about 180 tons, ships in 250+ crates, and takes months to install. ASML produces roughly 50–60 of these per year.

### High-NA EUV — The Next Step

The next-generation tool is **High-NA EUV** (NXE/EXE:5000 series). NA stands for Numerical Aperture — a measure of how steeply the lens system can focus light. Higher NA = sharper focus = smaller features printable in a single pass.

- **Cost**: ~$370–380M per tool
- **Resolution**: ~8nm features (vs ~13nm for standard EUV)
- **Status (early 2026)**: Intel deploying first for 14A node; TSMC validating on Fab 20 in Taiwan; Samsung preparing for SF4. ASML targeting 60 units in 2026, 80 in 2027.

The trade-off: High-NA tools have a smaller field of view (half the area). This means more exposures per wafer, slower throughput, and higher cost per chip — at least initially. TSMC is sticking with standard EUV plus multi-patterning for N2 (2nm) and A16 (1.6nm), planning High-NA only for A14 (1.4nm) starting around 2027–28.

### Export Controls

Since 2019, the U.S. (working with the Dutch government) has blocked export of EUV machines to China. In 2023, restrictions extended to advanced DUV. This is the single biggest tool the West has used to constrain China's access to leading-edge logic. China can buy older lithography (mature nodes), but not the machines required for sub-7nm. SMIC has reportedly produced 7nm chips using DUV multi-patterning, but yields are poor and cost is high — exactly what EUV was invented to solve.

### What This Means

ASML is one of the most important strategic chokepoints on Earth. A single facility in Veldhoven produces the machines without which the AI buildout cannot continue. If ASML stops shipping, every advanced fab in the world has a ticking clock — these machines need replacement parts and maintenance, and existing nodes can be operated but not advanced. Recognizing this, ASML's decisions about who gets which tools first are essentially geopolitical decisions.

---

## 5. The Foundry Ecosystem

### Fabless vs. IDM

Two business models exist for making chips:

**Integrated Device Manufacturer (IDM)**: Same company designs and manufactures (Intel historically, Samsung, Micron). Vertically integrated.

**Fabless + Foundry**: Designer (NVIDIA, AMD, Apple, Qualcomm) outsources manufacturing to a contract foundry (TSMC, GlobalFoundries, Samsung Foundry). The fabless model now dominates because the capital intensity of leading-edge fabs is so extreme — a single 3nm fab costs $20–25 billion to build — that only a handful of companies can afford to operate at the frontier.

### TSMC — The Indispensable Company

Taiwan Semiconductor Manufacturing Company:

- **Leading-edge market share**: ~90%+ at 3nm and below
- **Total foundry market share**: ~60%+
- **Customers**: Apple (largest), NVIDIA, AMD, Qualcomm, Broadcom, MediaTek, Marvell, plus Intel for some products
- **Fabs**: Concentrated in Taiwan, with new fabs in Arizona (USA), Kumamoto (Japan), and Dresden (Germany) under various stages of construction
- **Capex**: ~$50B+ per year, largest in the industry

TSMC's edge is execution. They run more fabs at the leading edge than anyone, learn faster from each generation, and have closer relationships with the equipment makers (especially ASML) and with key customers. Their yield curves on new nodes are reliably better than competitors'.

### Samsung Foundry — The Distant Second

Samsung is the only other company producing leading-edge logic at scale (3nm GAA). They've struggled with yields, lost Apple as a foundry customer years ago, and have been beaten to most generational milestones by TSMC. Their competitive position is largely supported by being a captive foundry for Samsung's own products (Galaxy SoCs, Exynos) plus a few external customers.

### Intel — The Comeback Attempt

Intel was the world's leading chipmaker until roughly 2018, when they stalled at the 14nm and 10nm nodes while TSMC and Samsung pulled ahead. Under CEO Pat Gelsinger (2021–2024), Intel announced a "five nodes in four years" plan (Intel 7 → Intel 4 → Intel 3 → Intel 20A → Intel 18A) and opened the foundry business to external customers (Intel Foundry Services).

Intel 18A (~2nm equivalent) is now in production. They've signed Microsoft and a small number of other foundry customers. Whether Intel can run a successful third-party foundry — culturally very different from running internal manufacturing — remains the central question.

The U.S. CHIPS Act provided ~$8B of direct subsidies to Intel plus tens of billions in loans/credits, betting that domestic leading-edge logic capacity is a national priority.

### GlobalFoundries — The Trailing-Edge Specialist

GlobalFoundries (spun out of AMD in 2009) explicitly stopped developing leading-edge nodes around 7nm. They focus on mature nodes (12nm and above) for automotive, industrial, RF, and other applications where the leading edge isn't needed. Profitable, predictable, but not in the AI race directly.

### SMIC — China's Frontier Effort

Semiconductor Manufacturing International Corporation. China's leading foundry. Officially advertises 14nm; widely reported to have produced 7nm using DUV multi-patterning (notably for the Huawei Kirin 9000S in 2023 and successors). Without EUV, getting below 7nm is enormously expensive and produces low yields. SMIC is trying — but the gap to TSMC's leading edge is widening with each generation.

### The Wafer Supply Chain

A wafer is a polished disc of silicon, typically 300mm in diameter. The semi industry runs almost entirely on 300mm; a transition to 450mm was attempted and abandoned. Wafer production itself is concentrated: Shin-Etsu (Japan), SUMCO (Japan), Siltronic (Germany), and GlobalWafers (Taiwan) make most of the world's 300mm wafers.

---

## 6. Memory: HBM and the Bandwidth Wall

### The Memory Wall

A modern AI chip can perform thousands of operations per second per core. But each operation typically needs to read or write data. If memory bandwidth can't keep up, the compute units sit idle. The ratio of compute to memory bandwidth has been worsening for decades — compute scales much faster than memory access. This is the **memory wall**.

For AI workloads, especially large language model inference, memory bandwidth is often the binding constraint. A 70B-parameter model has ~140 GB of weights at 16-bit precision, and during inference every token generated requires reading the entire weight matrix. If you only have 80 GB/s of memory bandwidth, you generate ~0.5 tokens per second per chip; if you have 4 TB/s, you generate 25.

### DRAM, NAND, and HBM

Three types of memory matter at datacenter scale:

**DRAM**: Working memory. Volatile (loses data when power is off), fast, expensive per bit. Comes in DIMMs for CPUs.

**NAND flash**: Storage memory. Non-volatile, much slower than DRAM, much cheaper per bit. Used in SSDs.

**HBM (High Bandwidth Memory)**: A specialized form of DRAM stacked vertically and connected to the processor through a silicon interposer with thousands of parallel pins. Far higher bandwidth than standard DRAM, but lower capacity per dollar and harder to manufacture.

HBM is the memory format used in essentially all modern AI accelerators.

### How HBM Works

Take 4–16 standard DRAM dies, stack them vertically, and connect them through silicon vias (TSVs) — tiny holes etched through each die and filled with copper. The bottom of the stack is a "base die" that handles the interface to the outside world. The whole stack is then attached to a silicon interposer right next to the GPU/ASIC die.

Because the connection is through thousands of short, parallel wires rather than long PCB traces, HBM achieves bandwidth that ordinary DRAM simply cannot. The downside: the manufacturing is complex (TSV etching, stack alignment, thermal management), yields are lower, and the cost per gigabyte is 3–5x higher than standard DRAM.

### Generation Roadmap

| Generation | Per-stack bandwidth | Per-stack capacity | Status |
|-----------|--------------------|--------------------|--------|
| HBM2 | ~256 GB/s | up to 8 GB | Legacy |
| HBM2E | ~460 GB/s | up to 16 GB | Hopper-era |
| HBM3 | ~819 GB/s | up to 24 GB | H100 |
| HBM3E | ~1.2 TB/s | up to 36 GB | Blackwell |
| HBM4 | ~2.0 TB/s | up to 64 GB | Rubin (2026) |

A single Blackwell B200 has 8 stacks of HBM3E for ~192 GB at ~8 TB/s. A Rubin GPU has 8 stacks of HBM4 for ~288 GB at ~22 TB/s.

### HBM4's Architectural Shift

HBM4 doubles the interface width (from 1024 bits to 2048 bits per stack). Equally important: the base die moves from a legacy memory process to a logic process (5nm or 3nm). This means the base die can include actual computation — error correction, signal conditioning, even certain operations offloaded directly to memory. It's the beginning of "compute-in-memory" at production scale.

Side effect: HBM now competes for the same advanced logic capacity as the GPUs themselves. This couples the memory and logic supply chains in ways that didn't exist before, amplifying systemic risk.

### The Three HBM Suppliers

**SK Hynix** (South Korea): Market leader, ~50% share, first to ship each new generation. Primary HBM supplier to NVIDIA.

**Samsung** (South Korea): Largest overall memory company; struggled on HBM3 yields, lost share, now racing to recover with HBM4. Diversifying customer base across AMD, Google, and Chinese ASIC vendors.

**Micron** (USA): Late entrant; strong on HBM3E execution; took meaningful share over 2024–25. Only U.S.-headquartered HBM maker, increasingly important geopolitically.

### The Allocation Problem

As of early 2026, HBM4 production for the entire calendar year is contractually allocated to hyperscalers and major GPU vendors. Hyperscalers prepay months or years in advance to lock supply. The spot market is essentially nonexistent — small AI chip startups cannot get HBM at any price. Pricing on contracts has risen 15–25% year-over-year.

This is why hyperscalers' capex budgets aren't just buying GPUs — they're buying *priority* across an entire supply chain that's been booked for years.

---

## 7. Advanced Packaging: CoWoS and the Critical Choke Point

### The Packaging Problem

A modern AI chip is not a single die. It's a logic die (the actual GPU), surrounded by 6–12 HBM stacks, all connected at extremely high bandwidth, all operating reliably in production. The connections between logic and HBM need to be:

- **Short** (centimeters, not meters), to keep latency low
- **Numerous** (thousands of parallel connections per HBM stack)
- **Precise** (alignment to single-micron tolerances)
- **Thermal-tolerant** (a Blackwell chip dissipates 1000+ watts)

You can't do this on a printed circuit board. The wires would be too long, too few, too imprecise. You need to assemble everything onto a piece of silicon that acts as a high-density interconnect substrate. This is **advanced packaging**.

### CoWoS — Chip-on-Wafer-on-Substrate

TSMC's flagship advanced packaging process. The name describes the structure:

1. **Substrate** — the bottom layer, a printed circuit board that connects to the outside world
2. **Wafer** — a silicon interposer (a thin slice of silicon with thousands of interconnect lines etched into it)
3. **Chip** — the actual logic and HBM dies attached on top of the interposer

The interposer is what makes everything work. It has thousands of short, parallel connections between the GPU die and each HBM stack — the exact thing PCBs cannot do.

### CoWoS Variants

- **CoWoS-S**: First-generation, used through Hopper. Smaller interposer.
- **CoWoS-L**: Larger interposer using "local silicon interconnect" tiles. Required for Blackwell and Rubin because they exceed reticle limits and need huge interposers.
- **CoWoS-R**: A lower-cost variant using organic substrate elements.

CoWoS-L is the binding constraint for current AI chips. Its interposers are larger than reticle size, requiring stitching multiple lithography exposures together.

### The CoWoS Bottleneck

For the past three years, CoWoS capacity has been the single tightest point in the entire AI hardware supply chain. Numbers:

- Late 2023: ~15,000 wafers/month
- 2024: ~35,000–45,000 wafers/month
- 2025: ~75,000 wafers/month
- End of 2026: projected 120,000–130,000 wafers/month

Despite this aggressive scaling — TSMC has roughly tripled CoWoS capacity in ~24 months — demand has outrun supply at every step. NVIDIA has reportedly booked over 50% of TSMC's projected 2026–27 CoWoS capacity. Custom ASICs from Google, Amazon, Microsoft, and Meta consume most of the remainder.

### Why It's So Hard to Scale

CoWoS is not just buying more of one machine. It's the integration of:

- Silicon interposer fabrication (effectively a separate fab process)
- Bumping (placing solder microbumps on dies)
- Thermal Compression Bonding (TCB) — the precise placement of dies onto interposer
- Underfill, molding, and final assembly
- Test and burn-in

Each step has a different equipment vendor, different process recipes, and different yield curves. Every bottleneck must scale simultaneously, and adding a new packaging fab takes 2–3 years.

### Alternatives

- **Intel EMIB** (Embedded Multi-die Interconnect Bridge): Embeds small silicon bridges into the substrate rather than using a full silicon interposer. Used by Intel for their own products. Lower-cost but more limited.
- **Samsung X-Cube**: Samsung's 2.5D and 3D packaging suite.
- **Amkor and ASE**: OSATs (Outsourced Assembly and Test) building advanced packaging facilities, often in partnership with TSMC.
- **TSMC SoIC**: True 3D stacking (logic on logic). Used for things like AMD's V-Cache. Different tradeoffs than CoWoS.

For now, CoWoS-L is the only thing that does what NVIDIA and the AI ASIC vendors actually need at scale. That makes TSMC's packaging line — even more than its leading-edge logic line — the most strategically important manufacturing capacity on Earth.

---

## 8. Inside a Modern AI GPU

### Anatomy of an NVIDIA Blackwell B200

Take Blackwell as the canonical example. A single B200 package contains:

- **Two reticle-sized GPU dies** (TSMC 4NP node) bonded together via a high-speed chip-to-chip link, presented to software as a single GPU
- **8 HBM3E stacks** (192 GB total memory at 8 TB/s aggregate bandwidth)
- **A silicon interposer** (CoWoS-L) connecting it all
- **~208 billion transistors** total
- **Power**: ~1000W TDP (1200W in the Ultra variant)

The dies contain Streaming Multiprocessors (SMs) with tensor cores, CUDA cores, memory controllers, and on-chip cache (~50 MB L2 per die). The chip-to-chip interconnect runs at ~10 TB/s — fast enough that software treats the package as a single GPU.

### Rubin (2H 2026)

Rubin extends the same dual-die approach but on TSMC's N3P (3nm-class) process:

- **336 billion transistors** (1.6x Blackwell)
- **288 GB of HBM4** at 22 TB/s bandwidth (2.8x Blackwell)
- **50 PFLOPS of FP4 inference compute** (5x Blackwell)
- **35 PFLOPS of FP4 training compute** (3.5x Blackwell)
- **Paired with the new Vera CPU** — 88 custom Arm cores on TSMC 3nm, ~50W

Rubin Ultra (2027) is expected to combine four reticle-sized dies into one package, doubling the resources again.

### What's Actually on the Die

Modern GPU dies are mostly:

- **Tensor/matrix units** (~50–60% of area in AI-focused designs) — the units that actually do matrix multiplications
- **SRAM cache** (~20–25%) — extremely fast on-chip memory, the L1/L2 cache hierarchy
- **General compute units** — CUDA cores doing scalar/vector work
- **Memory controllers** — interfacing to HBM
- **Network interfaces** — NVLink, PCIe
- **Other** — power management, security, video engines (largely vestigial for AI)

The trend with each generation: more tensor unit area, more SRAM, lower precision support. The chip is becoming more specialized for AI with each iteration.

### The Memory Hierarchy

Data inside a GPU lives in a hierarchy of progressively faster, smaller, more expensive storage:

| Level | Capacity | Bandwidth | Latency |
|-------|----------|-----------|---------|
| Register file | KBs per SM | Picoseconds | <1 cycle |
| L1 cache / shared memory | ~256 KB per SM | TBs/sec | Few cycles |
| L2 cache | 50–200 MB per die | Multi-TB/sec | Tens of cycles |
| HBM | 80–288 GB | 8–22 TB/sec | Hundreds of cycles |
| CPU DRAM | 1–8 TB | 100s GB/sec | Thousands of cycles |
| NVLink to other GPU | — | 1.8 TB/sec | Microseconds |
| InfiniBand to other rack | — | 400 Gb/sec | Microseconds |
| SSD storage | TBs | GBs/sec | Milliseconds |

A huge fraction of AI software optimization — kernel design, attention algorithms (FlashAttention), model parallelism strategies — is about keeping data in the fast levels of this hierarchy as long as possible.

### Power Density

A Blackwell GPU dissipates ~1000W in roughly the area of a deck of cards. That's ~1 W/mm² — comparable to a stovetop burner. Cooling this is a major engineering problem (Section 14), and the number is going up every generation.

---

## 9. The Chip Designers

### NVIDIA — The Dominant Player

- **Market position**: ~80–90% of AI training; somewhat lower on inference
- **Revenue**: Datacenter revenue ~$120B+ run rate as of late 2025
- **Margins**: 70%+ gross, ~50%+ operating — historically anomalous for hardware
- **Roadmap**: Annual cadence — Hopper (2022) → Blackwell (2024) → Blackwell Ultra (2025) → Rubin (2H 2026) → Rubin Ultra (2027) → Feynman (2028)
- **Beyond chips**: NVLink, NVSwitch, InfiniBand (via Mellanox acquisition), DGX systems, CUDA, cuDNN, TensorRT, NIM microservices, full reference rack architectures

NVIDIA's dominance comes from compounding advantages: best-in-class chips, the most advanced networking, the deepest software stack, the largest installed base of trained engineers, and the strongest relationships with foundries and memory suppliers. Every new generation widens at least one of these gaps. The bear case is that customers — especially hyperscalers — eventually build enough of their own silicon to meaningfully cap NVIDIA's growth.

### AMD — The Credible Alternative

- **Products**: MI300X (Hopper-era competitor), MI325X (2024), MI355X (2025), MI400 series (2026)
- **Strengths**: HBM capacity advantage on each generation, competitive raw FLOPs, increasingly used for inference
- **Weaknesses**: ROCm software stack is far behind CUDA; weaker networking story; lower performance on training workloads
- **Customer base**: Microsoft, Meta, Oracle, plus some neoclouds

AMD is the legitimate #2 — they've shipped, customers have deployed at scale, and the gap to NVIDIA on raw chip capability has narrowed. The software gap remains the binding constraint for most workloads.

### Custom Silicon (Hyperscaler ASICs)

Each major hyperscaler has its own internal AI chip program:

- **Google TPU**: Longest-running effort. v5p and v6/Ironwood are the current generations. Used heavily for both training and inference of Google's own models, plus rented out via Google Cloud. Designed by Google with manufacturing/packaging by Broadcom and TSMC. **Anthropic notably uses TPUs at large scale.**
- **AWS Trainium / Inferentia**: Trainium for training, Inferentia for inference. Trainium 2 is the current production chip; Trainium 3 announced. Designed in-house by Annapurna Labs (acquired 2015).
- **Microsoft Maia**: First-generation chip (Maia 100) shipping in volume; designed with Microsoft's foundational model ambitions in mind.
- **Meta MTIA**: Meta Training and Inference Accelerator. Currently used heavily for ranking/recommendation; expanded for generative AI.

The economic logic of custom ASICs: at hyperscaler scale, you spend tens of billions per year on AI silicon. If you can save 20–30% on cost per query by designing your own chip optimized for your specific workloads, the chip's $500M–$1B development cost pays back quickly. The bonus: you secure your own packaging allocation at TSMC, breaking dependence on NVIDIA's procurement priorities.

Estimates suggest custom ASICs will be ~45% of CoWoS-based AI accelerator shipments by 2026, up from ~25% in 2024.

### Specialized Players

- **Cerebras**: Wafer-scale chips — a single silicon "chip" the size of a dinner plate. Niche but technically remarkable.
- **Groq**: Inference-optimized chips with deterministic latency. Strong on inference benchmarks.
- **SambaNova**: Reconfigurable dataflow architecture. Enterprise-focused.
- **Tenstorrent**: Open architecture, RISC-V based.
- **Etched**: Transformer-specific ASICs (Sohu).

These have technical merits but face the same software and ecosystem challenges as AMD, magnified.

### Chinese Players

- **Huawei Ascend**: 910C and successors. Constrained by SMIC's process limits. Used heavily within China but limited international footprint.
- **Cambricon, Biren, Moore Threads**: Various Chinese GPU/AI chip startups. Limited by export controls on TSMC production and ASML tools.

The Chinese AI hardware ecosystem is bifurcated from the global one. Chinese hyperscalers (ByteDance, Tencent, Alibaba) buy whatever NVIDIA chips they can within export-control limits (the H20 chip, then the B30A, etc.) and supplement with domestic Ascend.

---

## 10. Networking: Scale-Up vs. Scale-Out

### Why Networking Is Half the Game

A single GPU has 80–288 GB of HBM. A frontier model has 1–10+ TB of weights. Training requires synchronizing gradients across thousands of GPUs after every step. Inference at high throughput needs to spread a single model across many GPUs. None of this works without extremely high-bandwidth, low-latency networking.

The metric people care about: how much of the GPU's *theoretical* compute do you actually achieve when you scale to a cluster? On a poorly-networked cluster, this can drop below 30%. On well-networked clusters, 60–70%+ is achievable. Networking is not infrastructure overhead — it's a major determinant of training cost.

### The Two Tiers

**Scale-up** is networking *within* a tightly-coupled domain — a server, a rack, a pod. Used for the parts of computation where many GPUs need to act as one (model parallelism, tensor parallelism). Latency in microseconds, bandwidth in TB/s, very expensive per port.

**Scale-out** is networking *across* domains — between racks, between rooms, between data centers. Used for the parts where coupling can be looser (data parallelism, pipeline parallelism). Latency in tens of microseconds, bandwidth in hundreds of Gb/s, cheaper per port.

The trick is mapping the workload to the topology so that tight coupling stays inside scale-up domains.

### NVLink — NVIDIA's Scale-Up Fabric

NVIDIA's proprietary high-bandwidth interconnect. Now in its 5th generation:

- NVLink 4 (Hopper): ~900 GB/s per GPU
- NVLink 5 (Blackwell): ~1.8 TB/s per GPU
- NVLink 6 (Rubin): ~3.6 TB/s per GPU expected

NVLink connects GPUs through **NVSwitch** chips that act like the spine of a tightly-coupled domain. The full system is called NVLink Switch System. This is what allows 72 GPUs in an NVL72 rack to behave like one giant GPU.

### InfiniBand — The Scale-Out Workhorse

The dominant scale-out fabric for AI clusters. Originally developed for HPC (High-Performance Computing). NVIDIA acquired Mellanox in 2020, which made them the dominant InfiniBand supplier (effectively the only one for AI-class deployments).

Key features: lossless transmission, very low latency, RDMA (Remote Direct Memory Access — a server can read/write another server's memory without involving the CPU). Current generation is 400 Gb/s and 800 Gb/s NDR/XDR.

### Ethernet's Comeback

Until recently, InfiniBand owned high-end AI networking. But Ethernet has been catching up: 400G and 800G Ethernet are now widely deployed, and the industry has been adding RDMA-over-Ethernet (RoCE) and AI-optimized features.

The **Ultra Ethernet Consortium** (founded 2023, now including Microsoft, Meta, AWS, Broadcom, AMD, Oracle, and others — notably *not* NVIDIA) is developing an Ethernet-based fabric specifically for AI workloads. The bet is that an open Ethernet ecosystem with multiple vendors will eventually underprice and outcompete proprietary InfiniBand.

NVIDIA's Spectrum-X is their answer — Ethernet hardware with AI-specific features, designed to work with their GPUs and software stack.

### Co-Packaged Optics — The Next Step

As bandwidth requirements rise, the limits of copper interconnects are becoming binding. At ~200+ Gb/s per lane, copper signals attenuate too much over even short distances. The solution is bringing optical interconnects onto the chip package itself ("co-packaged optics" or CPO).

NVIDIA announced silicon photonics-based Spectrum-X and Quantum-X switches at GTC 2025/CES 2026 with dramatic claims (5x power efficiency, 10x reliability vs traditional optics). The Feynman generation (2028) is widely expected to use CPO at the GPU level itself.

Optical networking is its own supply chain — light sources (lasers), modulators, fibers, optical packaging. Companies like Coherent, Lumentum, and various startups (Ayar Labs, Lightmatter) are positioning here.

### Topology Choices

Inside a cluster, you arrange switches and links into a topology. Common patterns:

- **Fat tree**: Multi-tier hierarchy with extra bandwidth at higher tiers. Most common.
- **Dragonfly**: Optimized for HPC workloads.
- **Rail-aligned**: GPUs of the same index across racks share dedicated channels.

The mapping between the network topology and the model parallelism strategy is one of the most consequential decisions in cluster design.

---

## 11. The Rack and the Pod

### From Servers to Racks to Pods

A traditional datacenter rack is 42U (1U = 1.75 inches, total ~6 feet tall), runs at 7–10 kW, and houses a couple dozen 1U or 2U servers. Each server is a self-contained computer with CPU, RAM, network cards, maybe local storage.

For AI, this model has broken down. A single 8-GPU server (HGX) draws ~10–14 kW *by itself*. A modern AI rack houses many such servers plus the switches connecting them, plus the cooling — and the power draw has scaled up massively.

### NVIDIA's Reference Designs

NVIDIA increasingly sells not chips but full reference rack designs:

**HGX-style (8-GPU server)**: The traditional building block — a single chassis with 8 GPUs connected via NVSwitch. Ships in 8U–10U, draws 10–14 kW. Typically deployed 4–6 per rack.

**DGX**: NVIDIA-branded servers using the same HGX motherboards but with NVIDIA's full software stack pre-integrated. Sold as turnkey systems.

**GB200 NVL72**: The flagship Blackwell rack. Within a single rack:
- 72 Blackwell GPUs (paired with 36 Grace CPUs)
- All connected by NVLink Switch — appearing to software as one giant GPU
- ~1.4 exaflops of FP4 compute
- ~120 kW power draw
- Liquid-cooled

**GB300 NVL72**: Same form factor with Blackwell Ultra GPUs. ~1.1 exaflops dense FP4.

**Vera Rubin NVL72** (2H 2026): Same 72-package physical configuration, 144 GPU dies (NVIDIA shifted to die-counting nomenclature). 3.6 exaflops dense FP4. Drop-in compatible with existing Blackwell rack infrastructure.

**Rubin Ultra NVL576** (2027): A larger system spanning multiple racks, with 576 GPU dies in a single tightly-coupled domain.

### Pricing

A single Vera Rubin NVL72 rack is reported to cost ~$3–4M wholesale, with sticker prices to end customers possibly in the $7–9M range depending on configuration and channel.

### Power Distribution

At 120+ kW per rack, traditional power distribution (AC outlets, 208V circuits) doesn't work. AI racks use:

- **Busbars**: High-current copper bars running vertically up the back of the rack, delivering power directly to each compute tray
- **48V DC distribution**: Lower voltage but very high current; more efficient at converting to the 0.7V the chips actually use
- **Open Compute Project (OCP)**: Hyperscaler-led standardization effort for rack form factors, power, and cooling

### The Open Compute Project

OCP was founded by Facebook in 2011 and now includes most major hyperscalers. They publish open specs for datacenter racks, servers, and infrastructure — driving down costs and standardizing the ecosystem. Most modern hyperscaler datacenters use OCP-derived equipment from Taiwanese ODMs (Wiwynn, Quanta, Foxconn) rather than traditional brand-name vendors (Dell, HPE).

### NVIDIA's Kyber Rack Architecture

Announced at GTC 2025 — a denser rack architecture rotating compute trays 90 degrees (vertical cartridges) to fit more compute per rack. Possible only with liquid cooling. This is the kind of architectural change that becomes necessary as you push past 100 kW per rack.

---

## 12. The Datacenter as a Computer

### From Rooms to Buildings to Campuses

Twenty years ago, a "data center" was often a room in an office building. Ten years ago, hyperscalers had buildings of 30–100 MW. Today's frontier AI campuses are 1+ GW spread across multiple buildings on hundreds of acres.

Microsoft's Stargate (with OpenAI), Meta's Hyperion (Louisiana), Amazon's Indiana campuses, and Google's various sites are all targeting multi-gigawatt deployments. The unit of design has moved from the rack to the building to the campus.

### Tier Classification

The Uptime Institute classifies datacenters by reliability:

- **Tier I**: Basic, single path, no redundancy. Annual downtime ~28 hours.
- **Tier II**: Redundant components but single distribution path. ~22 hours downtime.
- **Tier III**: Concurrently maintainable — N+1 redundancy. ~1.6 hours downtime.
- **Tier IV**: Fault tolerant — 2N redundancy. ~26 minutes downtime.

Most enterprise data centers are Tier III. AI training is interesting because individual jobs can tolerate some downtime (you just resume from a checkpoint), so frontier AI sites may relax some redundancy in exchange for speed and cost. Inference data centers, serving live customer traffic, are typically more reliable.

### Power Usage Effectiveness (PUE)

The standard efficiency metric:

**PUE = Total facility power / IT equipment power**

A PUE of 1.0 is theoretical perfection (every watt going to compute). Anything above 1.0 represents overhead (cooling, lighting, power conversion). Numbers in the wild:

- Enterprise data centers: 1.5–2.0+
- Hyperscale, 2010s: ~1.2
- Modern hyperscale: ~1.1
- Best-in-class with free air cooling: ~1.05

PUE is most affected by climate (cooling load), cooling system design, and power distribution efficiency.

### The Critical Facilities Layer

A datacenter is only superficially a building full of computers. Underneath sit:

- **Substations**: Stepping down utility power from 100+ kV to building-usable voltages
- **UPS (Uninterruptible Power Supplies)**: Battery banks bridging brief grid outages
- **Backup generators**: Diesel, increasingly natural gas, sized to run the entire load if utility power fails
- **Chillers**: Cooling water systems that reject heat from the IT equipment
- **CRAH/CRAC units**: Air handlers in the white space
- **Liquid distribution**: For AI sites with direct-to-chip cooling — pumps, manifolds, heat exchangers
- **Fire suppression**: Inert gas systems (FM-200, Inergen) that smother fires without water damage
- **BMS (Building Management System)**: Software orchestrating it all

These aren't extras — they typically account for 50%+ of the total construction cost. For a $1B AI datacenter, the IT equipment might be $500M and the facility infrastructure another $500M+.

---

## 13. Power: The Gigawatt Problem

### How Much Power Are We Talking About?

| Type | Typical Power |
|------|---------------|
| Closet server | Hundreds of W |
| Enterprise data center | 5–20 MW |
| Traditional hyperscale building | 30–100 MW |
| Hyperscale campus (early 2020s) | 200–500 MW |
| Frontier AI campus (2026+) | 1–5 GW |

For reference: 1 GW is roughly the output of a large nuclear reactor, or the consumption of a city of 750,000 people. There are hyperscaler campuses being planned today that will draw more power than entire U.S. states.

### The Hyperscaler Power Pipeline

Aggregate hyperscaler capex for 2026 is projected at **$660–700 billion** across Amazon (~$200B), Google (~$175–185B), Meta (~$115–135B), Microsoft (~$110–120B), and Oracle (~$50B). Roughly 75% of this is AI infrastructure — meaning ~$450 billion of AI-specific spending in a single year. Most of that is going into physical buildings and the power infrastructure around them.

### Why Power Has Become THE Bottleneck

GPUs you can buy. Land you can buy. Power, at the scale and timeline modern AI needs, has become the binding constraint. The grid in most regions cannot deliver new gigawatt-scale loads in less than 7–15 years through normal interconnection processes. The build itself takes 2–4 years to construct GPUs in.

This is why power-availability has become the #1 site selection criterion (Section 15) and why hyperscalers are taking unusual steps:

- **Microsoft**: Contracted to restart Three Mile Island Unit 1 (Constellation Energy)
- **Google**: PPAs with advanced nuclear startups (Kairos Power)
- **Amazon**: Acquired the Talen/Susquehanna nuclear-adjacent campus
- **Oracle**: Building gas-fired generation directly on site
- **Meta**: Geothermal partnerships, exploring SMRs

The pattern: large customers are increasingly bypassing the regulated grid, contracting directly with generators or building their own power.

### The Co-Location Controversy

Some sites plug data center loads directly into a power plant's high-voltage bus, "behind the meter" — effectively bypassing the public transmission system. The Amazon-Talen Susquehanna arrangement was the highest-profile case.

Critics argue this:
- Removes generation capacity from the public grid, raising prices for everyone else
- Bypasses the cost-allocation process for transmission upgrades
- Concentrates power at a few large customers' expense to other ratepayers

In December 2025, FERC issued an order directing PJM to reform its tariff for co-located loads, establishing new transmission services and behind-the-meter generation rules. This is an active policy frontier and a major driver of energy market dynamics.

### The Generation Fight

Behind the AI buildout is an enormous question: where does all this electricity *come from*? 

- **Renewables**: Cheap but intermittent. AI training loads are 24/7, not solar-shaped. Storage helps but isn't yet economic at gigawatt-day scale.
- **Natural gas**: The default — fast to build, dispatchable, but emissions-intensive.
- **Nuclear**: Ideal in principle (firm, clean, dense). But existing reactor fleet is aging, new construction has been notoriously slow and expensive in the U.S. SMRs and advanced reactor designs are promising but unproven.
- **Geothermal**: Enhanced geothermal (drilling deep enough to reach hot rock anywhere) is a quietly exciting frontier.

The result: a multi-year scramble to bring every form of firm generation online simultaneously. Gas plants getting built. Nuclear plants getting refurbished or extended. Pre-permitted sites being snapped up. Engineers who know how to build power plants are suddenly in extreme demand.

### Substations and Transmission

Even when generation exists, getting the power to the data center requires:
- A high-voltage substation (the step-down from transmission to distribution voltage)
- High-voltage transmission lines if generation is far from load
- Distribution upgrades within the campus

A new 500+ MW substation can take 3–7 years to permit and build. Long-distance transmission lines often take 10+ years (Section 13 of the electricity primer goes deep on this). The pace of grid construction is being held up by interconnection queues, permitting, and supply chain constraints on transformers themselves (transformer lead times have stretched from months to 2–3 years).

---

## 14. Cooling at Scale

### The Heat Problem

Every watt of compute eventually becomes a watt of heat. A 200 MW AI campus is producing 200 MW of waste heat — roughly the thermal output of a small power plant — and all of it has to go somewhere.

Furthermore, AI chips are getting denser. A Hopper H100 dissipated ~700W. A Blackwell B200 dissipates ~1000W. Rubin will likely exceed 1500W per package. At rack scale, NVL72 racks pull 120+ kW; future racks will be 250+ kW.

### Air Cooling Has Run Out of Road

Traditional data centers use hot aisle / cold aisle air cooling: cold air is forced under a raised floor and up through the front of racks; hot exhaust comes out the back and is captured by the cooling system. This works up to maybe 30 kW per rack with aggressive design.

At 100+ kW per rack, air cooling fails physically — you cannot move enough air through a rack to remove that much heat without absurd fan power and noise levels. This forced a transition.

### Direct-to-Chip Liquid Cooling

The dominant approach for new AI deployments. A cold plate (a small heat exchanger) sits directly on each GPU/CPU. Liquid (typically water with corrosion inhibitors and biocides) flows through the cold plate, picks up heat, exits the rack, and is cooled in a heat exchanger somewhere in the facility.

Advantages: removes 100+ kW per rack reliably, much higher PUE, much quieter. Disadvantages: every rack has plumbing, leaks are catastrophic, requires major facility infrastructure for fluid distribution.

NVIDIA's NVL72 designs are liquid-cooled by default. Hyperscalers are retrofitting older buildings or designing new ones around liquid distribution.

### Immersion Cooling

A more aggressive option: submerge the entire server in dielectric fluid (a non-conductive liquid that doesn't damage electronics). Heat is removed by the fluid circulating to a heat exchanger.

- **Single-phase immersion**: Fluid stays liquid; pumped through a heat exchanger.
- **Two-phase immersion**: Fluid boils when it contacts hot components, vapor rises and condenses on a coil at the top, drips back down. Extremely efficient (latent heat of vaporization is ~600x sensible heat at the same temperature change).

Two-phase immersion can handle 200+ kW racks but isn't yet mainstream — fluid cost, maintenance complexity, and ecosystem maturity are limiters.

### The Water Problem

Direct-to-chip and most facility cooling rejects heat to water. That water either:

- **Evaporates** in cooling towers — efficient but consumptive (water is lost to the atmosphere)
- **Recirculates** in dry coolers — uses more electricity but no water consumption
- **Runs through a body of water** — old-school, increasingly limited by regulation

A 1 GW AI campus using evaporative cooling can consume millions of gallons of water per day. In water-stressed regions (Arizona, Texas, parts of California), this has become controversial. Some hyperscalers (Microsoft, Google) are publicly committing to "water positive" operations, often through dry cooling and offsetting.

### Heat Rejection at Scale

Even with optimal cooling, gigawatt-scale data centers are rejecting gigawatts of low-grade heat (typically 30–40°C water). Some experiments with district heating (using data center waste heat to warm buildings or greenhouses) exist but face the practical problem that data centers are usually not co-located with heat demand.

---

## 15. Site Selection and Geography

### The New Site Selection Hierarchy

For decades, data center site selection was driven by latency to users, fiber connectivity, tax incentives, and labor. The AI buildout has reordered the priority list:

1. **Power availability and timeline** — can you get 500+ MW soon? This now dominates everything else.
2. **Power cost** — utility rates, ability to source cheap renewables or behind-the-meter generation
3. **Cooling/water** — climate (cool air = cheap free cooling), water rights
4. **Land** — large parcels, zoning, ability to build to multi-GW
5. **Permits and politics** — local government posture toward data centers
6. **Connectivity** — fiber backbone access, latency to users (more important for inference than training)
7. **Tax incentives** — sales tax exemptions on equipment, property tax abatements
8. **Workforce** — operations and construction labor

For pure training workloads, latency to users almost doesn't matter — you can train in the middle of nowhere. For inference, you still want to be reasonably close to user populations to keep response times under ~100ms.

### Hot Geographies

**Northern Virginia (Loudoun County)**: Historically the world's largest data center hub. ~3+ GW of installed load and growing. Now severely power-constrained — Dominion Energy has stretched interconnection times to 5+ years for new large loads. Premium prices but declining new construction.

**Phoenix area (Arizona)**: Rapid growth driven by Apple, Microsoft, Meta, Google. APS power is available but water has become a concern. TSMC's Arizona fab has also concentrated chip-related infrastructure here.

**Texas**: Especially around Dallas, Austin, San Antonio, and West Texas. ERCOT's faster interconnection process (relative to PJM/Dominion), abundant wind/solar, business-friendly regulation. Reliability risk after Winter Storm Uri is the lingering caveat.

**Hillsboro, Oregon**: Historical Intel hub; Google, Meta, Amazon all have major sites. Hydropower plus mild climate is a strong combination.

**Quincy, Washington / Central Washington**: Cheap hydroelectric power plus cool climate. Microsoft's flagship cloud campus is here.

**Iowa, Nebraska, Indiana, Ohio**: Newer hubs as Tier 1 markets fill up. Cheap power, cheap land, motivated state governments.

**Northern Sweden / Iceland / Quebec**: For workloads where latency to U.S./European users is acceptable, the cold climate dramatically cuts cooling costs and renewable hydro/geothermal is abundant.

### Latency Geography

For inference, you want data centers close to users. Major U.S. inference geographies (different from training): Northern Virginia (East Coast users), Bay Area / Pacific Northwest (West Coast users), Dallas/Atlanta/Chicago (population centers). Globally: Frankfurt, Dublin, Singapore, Sydney, Tokyo are the major hubs.

The latency-vs-power tradeoff has produced a barbell pattern: training at cheap-power, low-latency-irrelevant sites; inference at high-cost, latency-sensitive sites.

### The Permitting Frontier

Some states and counties have leaned into hosting data centers (Virginia historically, Texas, Iowa). Others have started pushing back as the load on grids and water becomes politically visible. Local moratoriums on new data centers have appeared in parts of Virginia, Georgia, and elsewhere. Permitting is increasingly the binding constraint on top of power.

---

## 16. Hyperscalers, Neoclouds, and the Customer Stack

### The Customer Tiers

Buyers of AI compute fall into roughly four tiers:

**Tier 1 — Hyperscalers**: Microsoft, Google, Amazon, Meta, Oracle. Build their own data centers, buy GPUs in tens or hundreds of thousands of units, run their own cloud platforms, and increasingly design their own silicon. Aggregate 2026 capex >$650B.

**Tier 2 — Neoclouds**: GPU-as-a-Service specialists. CoreWeave, Lambda, Crusoe, Nebius, IREN, Together AI. Don't build hyperscale infrastructure for general cloud; specialize in renting GPU compute to AI companies. Often financed with debt secured against GPU contracts.

**Tier 3 — AI Labs and Research**: OpenAI, Anthropic, Mistral, xAI, Cohere. Don't own the hardware; rent at massive scale from Tier 1 or Tier 2. Often have multi-year contracted commitments worth tens of billions.

**Tier 4 — Enterprise**: Companies running their own AI workloads — financial services, pharma, defense. Some build private clusters; most rent.

### The Hyperscaler Model

Hyperscalers' core business is renting compute to others, including each other. They benefit from:
- Massive scale (utility-like fixed costs amortized across millions of customers)
- Vertical integration (custom silicon, custom networking, custom software)
- Distribution (existing cloud customer base to upsell AI to)
- Capital (cash-rich parents subsidizing infrastructure investment)

They're spending capex at 45–57% of revenue — historically extreme — under the bet that AI demand will keep growing fast enough to fill the buildout. Free cash flow is collapsing across all four (Amazon expected to be free-cash-flow negative in 2026), funded by debt issuance ($108B of hyperscaler debt issued in 2025; $1.5T projected over coming years).

### The Neocloud Model

Neoclouds emerged because AI labs needed enormous amounts of NVIDIA compute faster than Tier 1 hyperscalers could provision it for them. Pure-play GPU rental shops, often originally crypto miners pivoting (Crusoe, Iris Energy/IREN) or new entrants (CoreWeave, founded as a crypto firm; Lambda, GPU-focused from the start).

Their business model: secure GPU allocation directly from NVIDIA, finance acquisition with asset-backed debt or equity, sign long-term rental contracts with AI labs, run the deployment.

CoreWeave IPO'd in March 2025 and has become the bellwether for the segment. Key risks for neoclouds:
- GPU resale value if the AI buildout slows
- Concentration in a few large customers (Microsoft, OpenAI, Meta)
- Power and site constraints just like everyone else
- Competition from hyperscalers and from each other

### The "Self-Supply" Pattern

A notable trend is large AI labs taking equity or commercial stakes in their own infrastructure — moving from being just a customer toward being a partial owner. OpenAI's Stargate project (with Microsoft, Oracle, SoftBank) is the most visible example. Anthropic has equivalent multi-year capacity deals. xAI built its Memphis "Colossus" cluster more or less from scratch.

The economics: at hundreds of billions in committed compute spend, aligning incentives by taking equity in or contractually controlling the underlying physical assets is just sensible procurement.

### Data Center REITs and Wholesale Operators

Beneath the hyperscalers sit pure data center landlords — Equinix, Digital Realty, CyrusOne (now KKR), QTS, Aligned. They build "wholesale" data centers (just shells with power and cooling) and lease to hyperscalers and large enterprises. Historically the hyperscalers built more of their own; now, faced with the speed of the buildout, they're leasing more wholesale capacity. This has been a quiet windfall for the wholesale segment.

A related category is the colocation specialists serving the inference market: Equinix's interconnection-rich urban facilities, where AI inference deployments sit close to the public internet backbone.

---

## 17. The Software Stack and CUDA's Moat

### Why Software Matters Hardware-First

A $40,000 GPU is only as useful as the software running on it. The chain from "PyTorch model" to "GPU instructions" involves:

1. **Framework**: PyTorch, JAX, TensorFlow — high-level Python APIs
2. **Compiler**: Translates the framework's computation graph into operations on the target hardware (XLA, torch.compile, ONNX Runtime)
3. **Kernel libraries**: Pre-optimized implementations of common operations — matrix multiply, attention, normalization (cuBLAS, cuDNN, CUTLASS, FlashAttention)
4. **Runtime**: Memory management, scheduling, multi-GPU orchestration (CUDA Runtime, NCCL for collective communications)
5. **Driver**: The kernel-mode software that talks to the actual hardware

Every layer has to work. A weakness anywhere shows up as low GPU utilization, slow training, or outright failures.

### CUDA — The 18-Year Moat

NVIDIA introduced CUDA in 2006 — a programming framework letting developers use GPUs for general computation, not just graphics. They invested for nearly a decade with limited commercial return, building libraries, tooling, training materials, and academic relationships. By the time the deep learning revolution hit (2012, AlexNet) the GPU programming community was already a CUDA community.

What CUDA provides:
- A C/C++ language extension for writing GPU kernels
- A vast set of optimized libraries (cuDNN for neural networks, cuBLAS for linear algebra, NCCL for multi-GPU communication, TensorRT for inference)
- Decades of community-contributed code (every major ML paper publishes CUDA implementations first)
- Deep integration with PyTorch, TensorFlow, JAX

When AMD or a custom-silicon company tries to replicate this, they're not just porting a single framework — they're trying to recreate a 15-year ecosystem. AMD's ROCm has improved markedly but still has rough edges at the cutting edge. PyTorch on AMD works for many models, breaks on others, and is generally a year behind PyTorch on NVIDIA in feature parity.

This is why custom silicon at hyperscaler scale only really works for hyperscalers — they have the engineering capacity to write the missing software for their own internal use, plus the workload concentration to amortize the cost.

### Inference-Specific Software

Training and inference have very different software needs. Training is throughput-optimized (process the most tokens per second across the cluster). Inference is latency-and-cost optimized (serve the most queries per dollar).

Inference software stacks include:
- **TensorRT-LLM**: NVIDIA's optimized inference runtime
- **vLLM**: Open-source inference server with paged attention
- **NIM**: NVIDIA's containerized inference microservices
- **NVIDIA Dynamo**: Announced as the "operating system for AI factories" — orchestrating inference across thousands of GPUs

Inference performance at any given chip is often 30–50% below the chip's theoretical peak, with software efficiency gains accumulating over time as engineers find better implementations.

### The Compiler Frontier

Long-term, the bet for non-NVIDIA chips is that compiler technology (translating high-level frameworks to any hardware target) gets good enough that hand-tuned CUDA kernels stop being a moat. MLIR, OpenXLA, and Triton are all attempts at this. Progress has been real but slower than optimists expected. NVIDIA, recognizing the threat, is also a major contributor to these projects — partly to maintain optionality, partly to hedge.

---

## 18. Capex and Compute Economics

### Cost of a Training Cluster

A representative back-of-envelope for a 100,000-GPU cluster:

- **GPUs**: 100,000 × $40K = $4.0B
- **Network (NVLink switches, InfiniBand fabric)**: ~$0.4–0.6B
- **Servers, racks, cabling**: ~$0.3B
- **Datacenter shell, power infrastructure, cooling**: ~$1.5–3.0B (depends heavily on greenfield vs leased)
- **Land, permitting, soft costs**: ~$0.2B

Total: $6–8 billion for a frontier-scale training cluster. The largest sites (Microsoft Stargate, Meta Hyperion) involve $50–100B+ committed across multi-year buildouts.

### GPU Pricing

| GPU | Approximate Wholesale Price |
|-----|----------------------------|
| H100 | $25–35K |
| H200 | $30–40K |
| B200 | $40–50K |
| B300 (Blackwell Ultra) | $55–70K |
| Rubin (R200) | $80–100K (estimated) |

Margin on these is enormous (NVIDIA gross margins ~75%), reflecting the supply imbalance. Custom ASICs have much lower price points but require billions in development.

### Useful Life and Depreciation

Hyperscalers historically depreciated servers over 4–5 years, recently extended to 6 years for general-purpose hardware. AI hardware is depreciated faster — typically 4–5 years — because each new generation is so much more efficient that older hardware quickly becomes uncompetitive on cost-per-token.

This depreciation is now a major P&L item. Aggregate hyperscaler AI-asset depreciation is projected to hit ~$400B per year — exceeding their combined 2025 profits. This is the financial mechanic behind why "capex efficiency" has become so much more important than it used to be.

### Cost Per Token

The end-customer-facing metric. A frontier model serving inference at scale costs:
- $1–10 per million input tokens (depending on model size and context)
- $5–60 per million output tokens

Over the past three years, the cost per token to serve any given model quality has dropped roughly 90%+ — partly from better hardware, partly from better software, partly from algorithmic efficiency improvements.

NVIDIA argues that each generation roughly drops cost-per-token by another 5–10x. If that continues, the unit economics of inference get much better, but the absolute compute volume goes up faster, so total spend keeps rising.

### Training Run Economics

A single frontier model training run currently costs $50M–$500M depending on scale, run twice or three times for ablations and retraining. Inference at frontier scale rapidly exceeds training cost — for very popular deployed models, lifetime inference cost is 10x+ training cost.

This shift (inference becoming the dominant compute spend) is what's driven so much custom-silicon investment, since inference is more amenable to specialized hardware than training is.

### Returns?

Whether the AI capex cycle generates returns commensurate with the spending is the open question of the entire economy right now. Optimists point to:
- Real revenue growth at AI-native companies (OpenAI, Anthropic) 
- Productivity gains in software development, customer service, content production
- Enterprise adoption still in early innings

Skeptics point to:
- Hyperscaler free cash flow collapsing
- Most enterprise AI projects failing to achieve clear ROI
- Massive capacity coming online ahead of clear monetization paths
- Historical analogies (railroads, telecom in the late 1990s) where infrastructure overbuild led to long writedown cycles

Where this lands has implications for every layer of the stack discussed above.

---

## 19. Supply Chain Geopolitics

### The Concentration Map

The advanced AI hardware supply chain is geographically concentrated to a degree that has no real precedent in modern industry:

| Layer | Where It Happens |
|-------|------------------|
| EUV lithography machines | Netherlands (ASML) |
| EUV mirrors, optics | Germany (Zeiss) |
| Photoresist chemistry | Japan (TOK, JSR, Shin-Etsu, Sumitomo) |
| Specialty gases (neon, etc.) | Ukraine (historically), Russia, China |
| Silicon wafers | Japan (Shin-Etsu, SUMCO), Germany (Siltronic), Taiwan (GlobalWafers) |
| Leading-edge logic manufacturing | Taiwan (TSMC) |
| HBM memory | South Korea (SK Hynix, Samsung), USA (Micron) |
| Advanced packaging | Taiwan (TSMC), with U.S. and Vietnam build-outs |
| GPU/ASIC design | USA (NVIDIA, AMD, Apple, Google, Amazon, Microsoft, Meta, Broadcom) |
| AI cluster assembly | Taiwan ODMs (Foxconn, Wiwynn, Quanta) |
| Datacenters | USA, increasingly elsewhere |

A war in the Taiwan Strait, a fire at a single Japanese photoresist plant, or a major sanction package against Korean memory makers could individually disrupt the global AI buildout for years.

### The Taiwan Question

TSMC produces ~90% of leading-edge logic. Its main fabs are clustered in Hsinchu, Taichung, and Tainan — all in Taiwan, roughly 100 miles from China's coast. Any military action would likely involve fabs being destroyed or rendered inoperable (whether by Chinese action, Taiwanese sabotage, or U.S. strikes to deny capabilities to China). The AI buildout would be set back multiple years and global GDP would take a single-digit-percentage hit.

This is not a hypothetical that policymakers ignore. The CHIPS Act, TSMC's Arizona expansion, accelerated Japanese fabs, Samsung's Texas fab, Intel's foundry pivot — all of these are downstream of "Taiwan concentration" being an explicit national security concern.

### U.S. Export Controls

Since October 2022, the U.S. has applied progressively tighter controls on the export of:
- Advanced AI chips to China (banned: H100, H200, B200; permitted with throttling: H20, B30A — these have been progressively revised)
- Lithography equipment (EUV banned; advanced DUV controlled)
- Chip design tools (EDA software for advanced nodes)
- Semiconductor manufacturing equipment beyond a certain technology threshold

The intent is to slow China's ability to develop frontier AI capabilities. Effectiveness is debated. China responded by accelerating domestic capability (SMIC's 7nm, Huawei Ascend, Cambricon) and stockpiling permitted goods. Restrictions have been tightened in waves.

### The CHIPS Act and Reshoring

The U.S. CHIPS and Science Act (2022) provided ~$52B in semiconductor manufacturing subsidies plus ~$25B in tax credits and other incentives. Major recipients:
- Intel (~$8.5B direct + loans): Fabs in Arizona, Ohio, New Mexico
- TSMC (~$6.6B): Arizona fabs
- Samsung (~$6.4B): Texas fab
- Micron (~$6.1B): New York memory fab
- GlobalFoundries: New York expansion

These fabs are typically running 1–2 nodes behind their Asian counterparts and at higher unit cost — but they exist, and they represent real diversification.

The European Chips Act and the Japanese semiconductor strategy are smaller but parallel efforts.

### Other Vulnerabilities

- **Photoresist**: Three Japanese companies make most of the world's advanced photoresist. A 2011 earthquake disrupted supply for months.
- **Neon**: Critical for excimer lasers in DUV lithography. Historically, much of it came from Ukraine (as a byproduct of steelmaking). The 2022 war created shortages and forced supply diversification.
- **Hafnium, palladium, gallium, germanium**: Specialty metals concentrated in a few countries (Russia, China, South Africa) and used in specific semi processes. China placed export controls on gallium and germanium in 2023.
- **Ajinomoto Build-up Film (ABF)**: A specialty substrate film made primarily by one Japanese company. Critical for high-end CPU/GPU substrates.

These chokepoints don't get headlines like Taiwan, but a disruption in any of them propagates through the chain.

---

## 20. Bottlenecks and the Forward View

### The Shifting Bottleneck

The binding constraint on AI hardware shipments has moved over time:

- **2020–2022**: Foundry capacity (especially TSMC 5nm)
- **2023**: HBM memory
- **2023–2025**: Advanced packaging (CoWoS)
- **2025–2026**: HBM4 / packaging / power (multiple bindings)
- **2026–2028**: Power and grid interconnection
- **2028+**: Increasingly: data center construction throughput, transmission infrastructure, generation capacity

Most of these bottlenecks are being attacked aggressively, but they don't unbottleneck simultaneously. A new bottleneck emerges as soon as the prior one loosens.

### What This Means for the Investment Calendar

**Near-term (1–2 years)**: Continued shortages in CoWoS, HBM4, leading-edge logic. Pricing pressure favorable to suppliers. Allocations done by relationship and prepayment.

**Medium-term (2–4 years)**: Capacity catches up at the chip level, but power and grid interconnection become the dominant constraint. Premium for sites with secured power. Major buildouts of nuclear, gas, and renewables to serve this demand.

**Longer-term (5+ years)**: Either AI capex moderates (as actual revenues catch up or fail to), and the industry has overbuilt — leading to a multi-year writedown cycle — or the buildout continues, with constraints shifting to construction, materials (steel, copper, transformers), and labor.

### Risks and Uncertainties

**The capex sustainability question**: Whether AI revenue grows fast enough to justify a $700B+/year capex cycle.

**The model efficiency question**: Whether algorithmic and software improvements continue to drop cost-per-token at the same rate. If yes, demand grows even faster (Jevons paradox); if no, ROI assumptions get harder.

**Geopolitical disruption**: Taiwan, Korea, China-U.S. relations broadly. Even moderate escalation disrupts the chain.

**Power infrastructure**: Whether the U.S. grid can actually be expanded fast enough. Many forecasts assume gigawatt-scale data centers come online on aggressive timelines that have never been achieved before.

**The architectural question**: Whether transformers (and their derivatives) remain the dominant model architecture, or whether a structural change (state-space models, mixture-of-experts at extreme scales, something not yet proven) reshapes hardware requirements.

### The Underlying Conviction

Putting aside the cycle question, the underlying physical buildout is the largest concentrated industrial expansion in living memory. The numbers — $700B/year, gigawatts of new generation, multi-million-square-foot buildings — are at scales that historically describe entire industries, not individual technology cycles.

Even if capex moderates, the assets being built will operate for 15–30 years. The companies that own irreplaceable links in this chain — TSMC's CoWoS line, ASML's EUV monopoly, the few hyperscaler-grade datacenter operators, the irreplaceable power assets — are likely to be very valuable for a long time. The companies stretched to fill the next layer up may not be.

This is the frame the rest of the document supports: a layered map of physical bottlenecks, each with its own incumbents, its own constraints, and its own pace of change. The AI buildout is happening in the seams between these layers, and the structure of the seams is the structure of the opportunity.

---

## 21. Key Concepts Glossary

| Term | Definition |
|------|-----------|
| **AI Factory** | NVIDIA marketing term for a datacenter purpose-built for AI workloads at scale |
| **ASIC (Application-Specific Integrated Circuit)** | Chip designed for a specific workload — distinct from general-purpose GPUs/CPUs |
| **ASML** | Dutch company; sole supplier of EUV lithography machines |
| **Blackwell** | NVIDIA's GPU architecture released in 2024 (B100/B200/B300); two-die design |
| **CHIPS Act** | 2022 U.S. legislation providing ~$52B in semiconductor manufacturing subsidies |
| **Co-Located Load** | Data center plugged in directly to a power plant, bypassing the public transmission system |
| **Co-Packaged Optics (CPO)** | Optical interconnects integrated directly onto chip packages, replacing copper |
| **CoWoS** | Chip-on-Wafer-on-Substrate; TSMC's flagship advanced packaging technology |
| **CUDA** | NVIDIA's GPU programming framework; the dominant ecosystem moat |
| **DGX** | NVIDIA-branded turnkey AI server systems |
| **DRAM** | Dynamic Random Access Memory; volatile working memory, foundation for HBM |
| **DUV** | Deep Ultraviolet lithography (193nm wavelength); used for nodes above 7nm |
| **EUV** | Extreme Ultraviolet lithography (13.5nm wavelength); enables 7nm and below |
| **FinFET** | 3D transistor architecture; standard from ~22nm to 3nm |
| **Foundry** | Contract chip manufacturer (TSMC, Samsung, Intel Foundry, GlobalFoundries) |
| **GAA (Gate-All-Around)** | Next-gen transistor architecture replacing FinFET at 2nm and below |
| **GPU (Graphics Processing Unit)** | Parallel processor; foundation of modern AI compute |
| **HBM (High-Bandwidth Memory)** | Stacked DRAM with massive parallel interface; standard in AI accelerators |
| **HGX** | NVIDIA's reference 8-GPU server platform |
| **High-NA EUV** | Next-generation EUV with higher numerical aperture; ~$370M per machine |
| **Hopper** | NVIDIA's GPU architecture released in 2022 (H100/H200) |
| **Hyperscaler** | Large cloud operators (Amazon, Google, Microsoft, Meta, Oracle) |
| **IDM** | Integrated Device Manufacturer — designs and produces chips in-house |
| **InfiniBand** | High-bandwidth low-latency networking standard; dominant in AI scale-out |
| **Interposer** | Thin silicon substrate that hosts logic and HBM dies in a CoWoS package |
| **Memory Wall** | The growing gap between compute speeds and memory bandwidth |
| **Moore's Law** | The observation that transistor count per chip doubles roughly every 2 years |
| **Neocloud** | Specialized GPU-as-a-Service company (CoreWeave, Lambda, Crusoe, etc.) |
| **Node** | A generation of chip manufacturing technology (3nm, 2nm, etc.) |
| **NVLink** | NVIDIA's proprietary high-bandwidth scale-up interconnect |
| **NVL72** | Reference rack design with 72 GPUs in a single tightly-coupled domain |
| **NVSwitch** | NVIDIA's switching chip enabling all-to-all NVLink connections |
| **OCP (Open Compute Project)** | Open hardware standardization effort started by Facebook |
| **PUE (Power Usage Effectiveness)** | Datacenter efficiency metric; total power / IT power |
| **Rack-Scale** | System design approach treating an entire rack as the unit of compute |
| **Reticle Limit** | Maximum die size printable in a single lithography exposure (~858 mm²) |
| **Rubin** | NVIDIA's 2026 GPU architecture; 336B transistors, HBM4 |
| **Scale-Up** | Tight networking within a node/pod (NVLink) |
| **Scale-Out** | Looser networking across racks and rooms (InfiniBand, Ethernet) |
| **SMIC** | Semiconductor Manufacturing International; China's leading foundry |
| **SoC** | System-on-Chip; integrating multiple functions on one die |
| **Stargate** | OpenAI/Microsoft/Oracle/SoftBank's gigawatt-scale datacenter program |
| **Tensor Core** | Specialized circuit on NVIDIA GPUs for matrix multiplication |
| **TPU (Tensor Processing Unit)** | Google's custom AI accelerator |
| **TrainIum / Inferentia** | AWS's custom AI training and inference accelerators |
| **TSMC** | Taiwan Semiconductor Manufacturing Company; ~90% of leading-edge logic |
| **TSV (Through-Silicon Via)** | Vertical interconnects through stacked silicon dies; enables HBM |
| **Ultra Ethernet** | Industry-led effort to replace InfiniBand with AI-optimized Ethernet |
| **Vera** | NVIDIA's custom Arm CPU paired with Rubin GPUs |
| **Wafer** | A polished silicon disc, typically 300mm; the substrate for all chip manufacturing |
| **Yield** | Fraction of usable chips per wafer; primary determinant of unit cost |

---

## 22. Appendix: Major Players

### Lithography
| Company | HQ | Role |
|---------|----|----|
| ASML | Netherlands | Sole EUV supplier; dominant DUV |
| Canon | Japan | Trailing-edge lithography; nanoimprint emerging |
| Nikon | Japan | DUV niche player |

### Foundries (Leading-Edge)
| Company | HQ | Notes |
|---------|----|----|
| TSMC | Taiwan | ~90% of leading-edge logic |
| Samsung Foundry | South Korea | Distant 2nd at leading edge |
| Intel Foundry | USA | Comeback effort via 18A; CHIPS Act recipient |
| SMIC | China | Limited by export controls |
| GlobalFoundries | USA | Trailing-edge specialist |

### Memory
| Company | HQ | Notes |
|---------|----|----|
| SK Hynix | South Korea | HBM market leader (~50%) |
| Samsung Memory | South Korea | Largest overall memory company |
| Micron | USA | Late HBM entrant; growing |

### GPU/AI Chip Designers
| Company | HQ | Notes |
|---------|----|----|
| NVIDIA | USA | Dominant; Blackwell, Rubin |
| AMD | USA | MI300/MI400 series |
| Google | USA | TPU (manufactured with Broadcom/TSMC) |
| AWS | USA | Trainium/Inferentia |
| Microsoft | USA | Maia |
| Meta | USA | MTIA |
| Broadcom | USA | TPU partner; networking ASICs |
| Apple | USA | M-series; not selling AI chips externally |
| Huawei | China | Ascend (constrained by SMIC) |
| Cerebras, Groq, SambaNova, Tenstorrent | USA | Specialized players |

### Networking
| Company | HQ | Role |
|---------|----|----|
| NVIDIA (Mellanox) | USA/Israel | InfiniBand; Spectrum-X Ethernet |
| Broadcom | USA | Tomahawk/Jericho switches; AI ASIC partner |
| Arista | USA | Datacenter Ethernet |
| Cisco | USA | Networking incumbent |
| Marvell | USA | Custom DPUs and networking silicon |

### Hyperscalers
| Company | 2026 Capex (est.) | Notes |
|---------|-------------------|----|
| Amazon (AWS) | ~$200B | Largest by capex |
| Alphabet (Google Cloud) | ~$175–185B | TPU advantage |
| Meta | ~$115–135B | Mostly internal AI; not a third-party cloud |
| Microsoft (Azure) | ~$110–120B | OpenAI partner |
| Oracle (OCI) | ~$50B | Stargate participant; growing fastest |

### Neoclouds
| Company | Notes |
|---------|----|
| CoreWeave | Largest; IPO'd 2025 |
| Lambda | GPU-focused since founding |
| Crusoe | Originally crypto/flare gas; now AI |
| Nebius | Spun out from Yandex; Amsterdam-listed |
| IREN | Listed; crypto pivot |
| Together AI | Distributed model serving |

### Datacenter REITs / Wholesale Operators
| Company | Notes |
|---------|----|
| Equinix | Interconnection-rich urban facilities |
| Digital Realty | Wholesale and retail |
| QTS | Acquired by Blackstone |
| CyrusOne | Acquired by KKR |
| Aligned | Hyperscale wholesale |
| Vantage | Hyperscale wholesale |
| Stack Infrastructure | Hyperscale wholesale |

### Power
| Sector | Key Names |
|--------|----|
| Nuclear restart / extension | Constellation, Vistra, Public Service Enterprise Group |
| Gas generators | NextEra, Calpine, Talen |
| SMRs (developing) | NuScale, X-energy, Kairos Power, Oklo |
| Geothermal | Fervo Energy, Sage Geosystems |
| Transmission / utilities | Dominion, AEP, Berkshire Energy, etc. |

---

*Last updated: April 2026*
