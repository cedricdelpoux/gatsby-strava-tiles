const fs = require("fs")
const path = require("path")
const {Z} = require("../map")
const {getSharp} = require("./sharp")

const TILE_PIXELS = 512 // what `@2x` returns for a 256 tile

async function fetchTile({url, cacheDir}) {
  const cached = cacheDir && path.join(cacheDir, encodeURIComponent(url))
  if (cached && fs.existsSync(cached)) return fs.readFileSync(cached)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} on ${url}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (cached) {
    fs.mkdirSync(cacheDir, {recursive: true})
    fs.writeFileSync(cached, buffer)
  }

  return buffer
}

// A card with no map under it. Without a background there is nothing to align
// to, so the frame is used exactly as asked for, and no tile is ever fetched.
async function getFlatBackground({frame, size, color}) {
  const sharp = getSharp()

  return {
    image: await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: color,
      },
    })
      .png()
      .toBuffer(),
    tiles: 0,
    frame,
  }
}

// Stitch the tiles covering the frame, then cut the frame out. Compositing at
// their own resolution first is what keeps seams out of the joins.
async function getBackground({frame, size, zoom, tileUrl, cacheDir, color}) {
  if (!tileUrl) return getFlatBackground({frame, size, color})

  const sharp = getSharp()

  const span = Math.pow(2, Z - zoom) // tiles of zoom 14 per background tile
  const minX = Math.floor(frame.x0 / span)
  const maxX = Math.ceil(frame.x1 / span) - 1
  const minY = Math.floor(frame.y0 / span)
  const maxY = Math.ceil(frame.y1 / span) - 1

  const tiles = []
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({x, y})
    }
  }

  const buffers = await Promise.all(
    tiles.map(({x, y}) =>
      fetchTile({url: tileUrl({z: zoom, x, y}), cacheDir}).then((input) => ({
        input,
        left: (x - minX) * TILE_PIXELS,
        top: (y - minY) * TILE_PIXELS,
      }))
    )
  )

  const canvas = sharp({
    create: {
      width: (maxX - minX + 1) * TILE_PIXELS,
      height: (maxY - minY + 1) * TILE_PIXELS,
      channels: 3,
      background: "#ffffff",
    },
  }).composite(buffers)

  // Crop on whole pixels and report the frame actually cut, so the overlay is
  // projected onto the ground the background really shows
  const perTile = TILE_PIXELS / span
  const left = Math.round((frame.x0 - minX * span) * perTile)
  const top = Math.round((frame.y0 - minY * span) * perTile)
  const width = Math.round((frame.x1 - frame.x0) * perTile)
  const height = Math.round((frame.y1 - frame.y0) * perTile)

  const image = await sharp(await canvas.png().toBuffer())
    .extract({left, top, width, height})
    .resize(size.width, size.height)
    .toBuffer()

  return {
    image,
    tiles: tiles.length,
    frame: {
      x0: minX * span + left / perTile,
      y0: minY * span + top / perTile,
      x1: minX * span + (left + width) / perTile,
      y1: minY * span + (top + height) / perTile,
    },
  }
}

module.exports = {getBackground}
