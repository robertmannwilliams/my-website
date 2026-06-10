---
id: 2
slug: why-this-chip
title: "Why This Chip"
kicker: "Prologue"
beats:
  - id: 2.1
    kind: diagram
    plate: gpu-grid
  - id: 2.2
    kind: text
---

## Beat 2.1

A quick word on why the AI world runs on GPUs and not the processors in your laptop.

AI, under the hood, is mostly one operation: multiplying enormous grids of numbers
against each other, billions of times. The work isn't clever; it's *vast*. A regular
processor (CPU) is a few brilliant workers — great at complicated sequential tasks. A
GPU is twenty thousand simple workers all doing the same small multiplication at once.

For grids of numbers, the twenty thousand win. It's not close — roughly a hundred times
faster, and the gap grows every generation.

## Beat 2.2

GPUs were invented for video game graphics, which happen to have the same shape: millions
of independent pixels, same operation on each. When neural networks took off, the right
chip already existed. One company — NVIDIA — had spent fifteen years building it, plus
the software that researchers had already standardized on. That head start is much of why
it's now among the most valuable companies in the world.

A modern AI GPU is one of the most complex objects humans manufacture. Making one
requires a planet-wide relay race. First leg: dirt.
