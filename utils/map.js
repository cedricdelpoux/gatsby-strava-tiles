const polyline = require("@mapbox/polyline")
const {midpoint} = require("@turf/midpoint")
const {roundTo5Decimals} = require("./utils")

const Z = 14

function lngToX(lng) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, Z))
}

function latToY(lat) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, Z)
  )
}

function xToLng(x) {
  return (x / Math.pow(2, Z)) * 360 - 180
}

function yToLat(y) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, Z)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function getMidpoint(point1, point2) {
  return midpoint(point1, point2).geometry.coordinates.map(roundTo5Decimals)
}

function demultiplyPoints(prevPoint, point) {
  const point4_8 = getMidpoint(prevPoint, point)
  const point2_8 = getMidpoint(prevPoint, point4_8)
  const point1_8 = getMidpoint(prevPoint, point2_8)
  const point3_8 = getMidpoint(point2_8, point4_8)
  const point6_8 = getMidpoint(point4_8, point)
  const point5_8 = getMidpoint(point4_8, point6_8)
  const point7_8 = getMidpoint(point6_8, point)

  return [
    point1_8,
    point2_8,
    point3_8,
    point4_8,
    point5_8,
    point6_8,
    point7_8,
    point,
  ]
}

function polylineToPoints(mapPolyline, demultiply = false) {
  return polyline.decode(mapPolyline).reduce((acc, point, index, array) => {
    if (demultiply && index > 0) {
      // Demultiply to create more points on a straight line
      return acc.concat(demultiplyPoints(array[index - 1], point))
    } else {
      return acc.concat([point])
    }
  }, [])
}

module.exports = {
  demultiplyPoints,
  polylineToPoints,
  lngToX,
  latToY,
  xToLng,
  yToLat,
  Z,
}
