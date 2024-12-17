function rangeArray(min, max) {
  var arrayLength = max - min + 1
  var array = new Array(arrayLength)

  for (var i = 0; i < arrayLength; i++) {
    array[i] = min + i
  }

  return array
}

function roundTo5Decimals(num) {
  return parseFloat(num.toFixed(5))
}

module.exports = {
  rangeArray,
  roundTo5Decimals,
}
