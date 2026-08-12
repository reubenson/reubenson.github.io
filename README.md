# About
This project is built with Eleventy, and hosted via GitHub pages at https://reubenson.com. In keeping with Github Pages reliance on Jekyll, static site pages are served from /docs.

Eleventy seems like a good enough choice for now, to build pages statically with minimal fuss. The underlying content is composed from modular markdown files, which allows the homepage[https://reubenson.com], [portfolio](https://reubenson.com/portfolio), things like CVs to be maintained together. Not really sure what most of this content is for at the moment, aside from being useful when applying to residencies.

## Getting Started
To get the app serving locally at localhost:8080:
```bash
npm i
npm run dev
```

## Deployments
`npm run dev` already handles static site generation, so all you need to do is push to origin.

## Line Drawing demo
`src/demos/line-drawing.md` is a grid-based rectilinear path editor with a few export options:

- **export SVG** — the drawn path (with mirror/repeat applied). Respects the **invert export** toggle, which renders white lines on a black background.
- **export KiCad PCB** — the path as `F.Cu` route segments in a KiCad 9/10 `.kicad_pcb` file. This export always emits the line itself as tracks and **ignores the invert toggle**. For an inverted (negative) copper fill, draw a zone over the area in KiCad and add a zone cutout tracing the exported tracks.
- **export/import moves** — JSON round-trip of the origin, canvas size, and move list.
