---
id: 10
slug: the-software
title: "How the Building Becomes a Mind"
kicker: "Software"
beats:
  - id: 10.1
    kind: diagram
    plate: training-room
  - id: 10.2
    kind: text
  - id: 10.3
    kind: text
---

## Beat 10.1

Now the part with no geography. Everything so far was hardware; here is what it's *for*.

Training a model works like this: take a neural network — billions of adjustable dials,
initially set at random — and show it most of the written internet, one fragment at a
time. For each fragment, ask it to guess the next word. Grade the guess. Nudge the dials.
Repeat trillions of times. The single training run executes across the entire building
for months, the largest computations our species performs.

## Beat 10.2

The output is almost comically mundane: a file. A very large list of numbers — the final
positions of all those dials — that you could carry on a briefcase of hard drives.
That file *is* the model. It's plausibly the most expensive object per pound ever made:
billions of dollars of compute, distilled into terabytes. Everything the model "knows"
lives in how those numbers are arranged.

## Beat 10.3

One more thing, because it explains the market: the software that orchestrates all those
GPUs — NVIDIA's CUDA — has been the industry's standard toolkit for over fifteen years.
Every researcher learned it; every lab's code assumes it. Competitors have built faster
chips on paper and lost anyway, because the moat was never just the silicon — it's that
the world's AI software speaks NVIDIA's language. In this industry, lock-in is built in
code as much as in fabs.
