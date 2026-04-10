console.time('generate')
generate()
console.timeEnd('generate')

// genaral function; run onload of to start from scratch
function generate(count) {
  // Add general elements
  let svg = d3.select('svg')
    .on('touchmove mousemove', moved)
  let mapWidth = +svg.attr('width')
  let mapHeight = +svg.attr('height')
  let defs = svg.select('defs')
  let viewbox = svg.append('g').attr('class', 'viewbox')
  let islandBack = viewbox.append('g').attr('class', 'islandBack')
  let mapCells = viewbox.append('g').attr('class', 'mapCells')
  let oceanLayer = viewbox.append('g').attr('class', 'oceanLayer')
  let circles = viewbox.append('g').attr('class', 'circles')
  let coastline = viewbox.append('g').attr('class', 'coastline')
  let shallow = viewbox.append('g').attr('class', 'shallow')
  let lakecoast = viewbox.append('g').attr('class', 'lakecoast')
  // Poisson-disc sampling from https://bl.ocks.org/mbostock/99049112373e12709381
  let sampler = poissonDiscSampler(mapWidth, mapHeight, sizeInput.valueAsNumber)
  let samples = []
  let sample
  while (sample = sampler()) samples.push(sample)
  // Voronoi D3
  let voronoi = d3.voronoi().extent([
    [0, 0],
    [mapWidth, mapHeight],
  ])
  let diagram = voronoi(samples)
  let polygons = diagram.polygons()
  // Colors D3 interpolation
  let color = d3.scaleSequential(d3.interpolateSpectral)
  // Queue array
  let queue = []

  let cursor = svg.append('g').append('circle').attr('r', 1).attr('class', 'cursor')

  // Add D3 drag and zoom behavior
  let zoom = d3.zoom()
    .scaleExtent([1, 50])
    .translateExtent([
      [-100, -100],
      [mapWidth + 100, mapHeight + 100],
    ])
    .on('zoom', zoomed)

  svg.call(zoom)

  function zoomed() {
    viewbox.attr('transform', d3.event.transform)
  }

  $('#resetZoom').click(() => {
    svg.transition().duration(1000).call(zoom.transform, d3.zoomIdentity)
  })

  // array to use as names
  let adjectives = ['Ablaze', 'Ablazing', 'Accented', 'Ashen', 'Ashy', 'Beaming', 'Bi-Color', 'Blazing', 'Bleached', 'Bleak', 'Blended', 'Blotchy', 'Bold', 'Brash', 'Bright', 'Brilliant', 'Burnt', 'Checkered', 'Chromatic', 'Classic', 'Clean', 'Colored', 'Colorful', 'Colorless', 'Complementing', 'Contrasting', 'Cool', 'Coordinating', 'Crisp', 'Dappled', 'Dark', 'Dayglo', 'Deep', 'Delicate', 'Digital', 'Dim', 'Dirty', 'Discolored', 'Dotted', 'Drab', 'Dreary', 'Dull', 'Dusty', 'Earth', 'Electric', 'Eye-Catching', 'Faded', 'Faint', 'Festive', 'Fiery', 'Flashy', 'Flattering', 'Flecked', 'Florescent', 'Frosty', 'Full-Toned', 'Glistening', 'Glittering', 'Glowing', 'Harsh', 'Hazy', 'Hot', 'Hued', 'Icy', 'Illuminated', 'Incandescent', 'Intense', 'Interwoven', 'Iridescent', 'Kaleidoscopic', 'Lambent', 'Light', 'Loud', 'Luminous', 'Lusterless', 'Lustrous', 'Majestic', 'Marbled', 'Matte', 'Medium', 'Mellow', 'Milky', 'Mingled', 'Mixed', 'Monochromatic', 'Motley', 'Mottled', 'Muddy', 'Multicolored', 'Multihued', 'Murky', 'Natural', 'Neutral', 'Opalescent', 'Opaque', 'Pale', 'Pastel', 'Patchwork', 'Patchy', 'Patterned', 'Perfect', 'Picturesque', 'Plain', 'Primary', 'Prismatic', 'Psychedelic', 'Pure', 'Radiant', 'Reflective', 'Rich', 'Royal', 'Ruddy', 'Rustic', 'Satiny', 'Saturated', 'Secondary', 'Shaded', 'Sheer', 'Shining', 'Shiny', 'Shocking', 'Showy', 'Smoky', 'Soft', 'Solid', 'Somber', 'Soothing', 'Sooty', 'Sparkling', 'Speckled', 'Stained', 'Streaked', 'Streaky', 'Striking', 'Strong Neutral', 'Subtle', 'Sunny', 'Swirling', 'Tinged', 'Tinted', 'Tonal', 'Toned', 'Translucent', 'Transparent', 'Two-Tone', 'Undiluted', 'Uneven', 'Uniform', 'Vibrant', 'Vivid', 'Wan', 'Warm', 'Washed-Out', 'Waxen', 'Wild']

  detectNeighbors()

  // for each polygon detect neibours and add their indexes
  function detectNeighbors() {
    // push neighbors indexes to each polygons element
    polygons.map((i, d) => {
      i.index = d // index of this element
      i.height = 0
      let neighbors = []
      diagram.cells[d].halfedges.forEach((e) => {
        let edge = diagram.edges[e]
        let ea
        if (edge.left && edge.right) {
          ea = edge.left.index
          if (ea === d) {
            ea = edge.right.index
          }
          neighbors.push(ea)
        }
      })
      i.neighbors = neighbors
    })
  }

  function add(start, type) {
    // get options
    let height = heightInput.valueAsNumber
    let radius = radiusInput.valueAsNumber
    let sharpness = sharpnessInput.valueAsNumber
    let queue = [] // polygons to check
    let used = [] // used polygons
    polygons[start].height += height
    polygons[start].featureType = undefined
    queue.push(start)
    used.push(start)
    for (i = 0; i < queue.length && height > 0.01; i++) {
      if (type == 'island') {
        height = polygons[queue[i]].height * radius
      }
      else {
        height = height * radius
      }
      polygons[queue[i]].neighbors.forEach((e) => {
        if (!used.includes(e)) {
          let mod = Math.random() * sharpness + 1.1 - sharpness
          if (sharpness == 0) {
            mod = 1
          }
          polygons[e].height += height * mod
          if (polygons[e].height > 1) {
            polygons[e].height = 1
          }
          polygons[e].featureType = undefined
          queue.push(e)
          used.push(e)
        }
      })
    }
  }

  function drawPolygons() {
    // delete all polygons
    svg.select('.mapCell').remove()
    // redraw the polygons based on new heights
    let grads = []
    let limit = 0.2
    if (seaInput.checked == true) {
      limit = 0
    }
    polygons.map((i) => {
      if (i.height >= limit) {
        mapCells.append('path')
          .attr('d', `M${i.join('L')}Z`)
          .attr('class', 'mapCell')
          .attr('fill', color(1 - i.height))
        mapCells.append('path')
          .attr('d', `M${i.join('L')}Z`)
          .attr('class', 'mapStroke')
          .attr('stroke', color(1 - i.height))
      }
      if (i.type === 'shallow') {
        shallow.append('path')
          .attr('d', `M${i.join('L')}Z`)
      }
    })
    if (blurInput.valueAsNumber > 0) {
      toggleBlur()
    }
  }

  // Mark GeoFeatures (ocean, lakes, isles)
  function markFeatures() {
    let queue = [] // polygons to check
    let used = [] // checked polygons
    // define ocean cells
    let start = diagram.find(0, 0).index
    queue.push(start)
    used.push(start)
    let type = 'Ocean'
    let name
    if (polygons[start].featureType) {
      name = polygons[start].featureName
    }
    else {
      name = adjectives[Math.floor(Math.random() * adjectives.length)]
    }
    polygons[start].featureType = type
    polygons[start].featureName = name
    while (queue.length > 0) {
      var i = queue[0]
      queue.shift()
      polygons[i].neighbors.forEach((e) => {
        if (!used.includes(e) && polygons[e].height < 0.2) {
          polygons[e].featureType = type
          polygons[e].featureName = name
          queue.push(e)
          used.push(e)
        }
      })
    }
    // define islands and lakes
    let island = 0
    let lake = 0
    let number = 0
    let greater = 0
    let less = 0
    let unmarked = $.grep(polygons, (e) => {
      return (!e.featureType)
    })
    while (unmarked.length > 0) {
      if (unmarked[0].height >= 0.2) {
        type = 'Island'
        number = island
        island += 1
        greater = 0.2
        less = 100 // just to omit exclusion
      }
      else {
        type = 'Lake'
        number = lake
        lake += 1
        greater = -100 // just to omit exclusion
        less = 0.2
      }
      name = adjectives[Math.floor(Math.random() * adjectives.length)]
      start = unmarked[0].index
      polygons[start].featureType = type
      polygons[start].featureName = name
      polygons[start].featureNumber = number
      queue.push(start)
      used.push(start)
      while (queue.length > 0) {
        var i = queue[0]
        queue.shift()
        polygons[i].neighbors.forEach((e) => {
          if (!used.includes(e) && polygons[e].height >= greater && polygons[e].height < less) {
            polygons[e].featureType = type
            polygons[e].featureName = name
            polygons[e].featureNumber = number
            queue.push(e)
            used.push(e)
          }
        })
      }
      unmarked = $.grep(polygons, (e) => {
        return (!e.featureType)
      })
    }
  }

  function drawCoastline() {
    d3.selectAll('.coastlines').remove()
    let line = [] // array to store coasline edges
    for (var i = 0; i < polygons.length; i++) {
      if (polygons[i].height >= 0.2) {
        let cell = diagram.cells[i]
        cell.halfedges.forEach((e) => {
          let edge = diagram.edges[e]
          if (edge.left && edge.right) {
            let ea = edge.left.index
            if (ea === i) {
              ea = edge.right.index
            }
            if (polygons[ea].height < 0.2) {
              let start = edge[0].join(' ')
              let end = edge[1].join(' ')
              if (polygons[ea].featureType === 'Ocean') {
                polygons[ea].type = 'shallow'
                var type = 'Island'
                var number = polygons[i].featureNumber
              }
              else {
                var type = 'Lake'
                var number = polygons[ea].featureNumber
              }
              line.push({ start, end, type, number })
            }
          }
        })
      }
    }
    // scales amd line for paths drawing
    let x = d3.scaleLinear().domain([0, mapWidth]).range([0, mapWidth])
    let y = d3.scaleLinear().domain([0, mapHeight]).range([0, mapHeight])
    let path = d3.line()
      .x((d) => {
        return x(d.x)
      })
      .y((d) => {
        return y(d.y)
      })
      .curve(d3.curveBasisClosed)
    // find and draw continuous coastline (island/ocean)
    let number = 0
    let type = 'Island'
    let edgesOfFeature = $.grep(line, (e) => {
      return (e.type == type && e.number === number)
    })
    while (edgesOfFeature.length > 0) {
      var coast = [] // array to store coastline for feature
      var start = edgesOfFeature[0].start
      var end = edgesOfFeature[0].end
      edgesOfFeature.shift()
      var spl = start.split(' ')
      coast.push({
        x: spl[0],
        y: spl[1],
      })
      spl = end.split(' ')
      coast.push({
        x: spl[0],
        y: spl[1],
      })
      for (var i = 0; end !== start && i < 2000; i++) {
        var next = $.grep(edgesOfFeature, (e) => {
          return (e.start == end || e.end == end)
        })
        if (next.length > 0) {
          if (next[0].start == end) {
            end = next[0].end
          }
          else if (next[0].end == end) {
            end = next[0].start
          }
          spl = end.split(' ')
          coast.push({
            x: spl[0],
            y: spl[1],
          })
        }
        var rem = edgesOfFeature.indexOf(next[0])
        edgesOfFeature.splice(rem, 1)
      }
      svg.select('#shape').append('path').attr('d', path(coast)).attr('fill', 'black')
      islandBack.append('path').attr('d', path(coast))
      coastline.append('path').attr('d', path(coast))
      number += 1
      edgesOfFeature = $.grep(line, (e) => {
        return (e.type == type && e.number === number)
      })
    }
    // find and draw continuous coastline (lake/island)
    number = 0
    type = 'Lake'
    edgesOfFeature = $.grep(line, (e) => {
      return (e.type == type && e.number === number)
    })
    while (edgesOfFeature.length > 0) {
      var coast = [] // array to store coasline for feature
      number += 1
      var start = edgesOfFeature[0].start
      var end = edgesOfFeature[0].end
      edgesOfFeature.shift()
      spl = start.split(' ')
      coast.push({
        x: spl[0],
        y: spl[1],
      })
      spl = end.split(' ')
      coast.push({
        x: spl[0],
        y: spl[1],
      })
      for (var i = 0; end !== start && i < 2000; i++) {
        var next = $.grep(edgesOfFeature, (e) => {
          return (e.start == end || e.end == end)
        })
        if (next.length > 0) {
          if (next[0].start == end) {
            end = next[0].end
          }
          else if (next[0].end == end) {
            end = next[0].start
          }
          spl = end.split(' ')
          coast.push({
            x: spl[0],
            y: spl[1],
          })
        }
        var rem = edgesOfFeature.indexOf(next[0])
        edgesOfFeature.splice(rem, 1)
      }
      edgesOfFeature = $.grep(line, (e) => {
        return (e.type == type && e.number === number)
      })
      lakecoast.append('path').attr('d', path(coast))
    }
    oceanLayer.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', mapWidth)
      .attr('height', mapHeight)
  }

  // Add a blob on mouseclick
  svg.on('click', function () {
    // draw circle in center in clicked point
    let point = d3.mouse(this)
    let nearest = diagram.find(point[0], point[1]).index
    circles.append('circle')
      .attr('r', 3)
      .attr('cx', point[0])
      .attr('cy', point[1])
      .attr('fill', color(1 - heightInput.valueAsNumber))
      .attr('class', 'circle')
    if ($('.circle').length == 1) {
      add(nearest, 'island')
      // change options to defaults for hills
      heightInput.value = 0.2
      heightOutput.value = 0.2
      radiusInput.value = 0.99
      radiusOutput.value = 0.99
    }
    else {
      add(nearest, 'hill')
      // let's make height random for hills
      let height = (Math.random() * 0.4 + 0.1).toFixed(2)
      heightInput.value = height
      heightOutput.value = height
    }
    // process with calculations
    $('path').remove()
    drawPolygons()
    markFeatures()
    drawCoastline()
  })

  function moved() {
    // update cursor and debug div on mousemove
    let point = d3.mouse(this)
    let nearest = diagram.find(point[0], point[1]).index
    let radius = heightInput.value * radiusInput.value * 100
    $('#cell').text(nearest)
    $('#height').text((polygons[nearest].height).toFixed(2))
    if (polygons[nearest].featureType) {
      $('#feature').text(`${polygons[nearest].featureName} ${polygons[nearest].featureType}`)
    }
    else {
      $('#feature').text('no!')
    }
    cursor.attr('r', radius)
      .attr('cx', point[0])
      .attr('cy', point[1])
      .attr('stroke', color(1 - heightInput.value))
  }

  if (count != undefined) {
    randomMap(count)
  }

  // Create randon map
  function randomMap(count) {
    for (c = 0; c < count; c++) {
      // Big blob first
      if (c == 0) {
        let x = Math.random() * mapWidth / 4 + mapWidth / 2
        let y = Math.random() * mapHeight / 4 + mapHeight / 2
        var rnd = diagram.find(x, y).index
        circles.append('circle')
          .attr('r', 3)
          .attr('cx', x)
          .attr('cy', y)
          .attr('fill', color(1 - heightInput.valueAsNumber))
          .attr('class', 'circle')
        add(rnd, 'island')
        radiusInput.value = 0.99
        radiusOutput.value = 0.99
      }
      else { // Then small blobs
        let limit = 0 // limit while iterations
        do {
          rnd = Math.floor(Math.random() * polygons.length)
          limit++
        } while ((polygons[rnd].height > 0.25 || polygons[rnd].data[0] < mapWidth * 0.25 || polygons[rnd].data[0] > mapWidth * 0.75 || polygons[rnd].data[1] < mapHeight * 0.2 || polygons[rnd].data[1] > mapHeight * 0.75)
          && limit < 50)
        heightInput.value = Math.random() * 0.4 + 0.1
        circles.append('circle')
          .attr('r', 3)
          .attr('cx', polygons[rnd].data[0])
          .attr('cy', polygons[rnd].data[1])
          .attr('fill', color(1 - heightInput.valueAsNumber))
          .attr('class', 'circle')
        add(rnd, 'hill')
      }
    }
    heightInput.value = Math.random() * 0.4 + 0.1
    heightOutput.value = heightInput.valueAsNumber
    // process the calculations
    markFeatures()
    drawCoastline()
    drawPolygons()
    $('.circles').hide()
  }

  // redraw all polygons on SeaInput change
  $('#seaInput').change(() => {
    drawPolygons()
  })

  // Draw of remove blur polygons on intup change
  $('#blurInput').change(() => {
    toggleBlur()
  })

  // Change blur, in case of 0 will not be drawn
  function toggleBlur() {
    d3.selectAll('.blur').remove()
    if (blurInput.valueAsNumber > 0) {
      let limit = 0.2
      if (seaInput.checked == true) {
        limit = 0
      }
      polygons.map((i) => {
        if (i.height >= limit) {
          mapCells.append('path')
            .attr('d', `M${i.join('L')}Z`)
            .attr('class', 'blur')
            .attr('stroke-width', blurInput.valueAsNumber)
            .attr('stroke', color(1 - i.height))
        }
      })
    }
  }

  // Draw of remove blur polygons on intup change
  $('#strokesInput').change(() => {
    toggleStrokes()
  })

  // Change polygons stroke-width,
  // in case of low width svg background will be shined through
  function toggleStrokes() {
    if (strokesInput.checked == true) {
      let limit = 0.2
      if (seaInput.checked == true) {
        limit = 0
      }
      polygons.map((i) => {
        if (i.height >= limit) {
          mapCells.append('path')
            .attr('d', `M${i.join('L')}Z`)
            .attr('class', 'mapStroke')
            .attr('stroke', 'grey')
        }
      })
    }
    else {
      d3.selectAll('.mapStroke').remove()
    }
  }

  // Based on https://www.jasondavies.com/poisson-disc/
  function poissonDiscSampler(width, height, radius) {
    let k = 30 // maximum number of samples before rejection
    let radius2 = radius * radius
    let R = 3 * radius2
    let cellSize = radius * Math.SQRT1_2
    let gridWidth = Math.ceil(width / cellSize)
    let gridHeight = Math.ceil(height / cellSize)
    let grid = new Array(gridWidth * gridHeight)
    let queue = []
    let queueSize = 0
    let sampleSize = 0

    return function () {
      if (!sampleSize)
        return sample(Math.random() * width, Math.random() * height)

      // Pick a random existing sample and remove it from the queue.
      while (queueSize) {
        let i = Math.random() * queueSize | 0
        let s = queue[i]

        // Make a new candidate between [radius, 2 * radius] from the existing sample.
        for (let j = 0; j < k; ++j) {
          let a = 2 * Math.PI * Math.random()
          let r = Math.sqrt(Math.random() * R + radius2)
          let x = s[0] + r * Math.cos(a)
          let y = s[1] + r * Math.sin(a)

          // Reject candidates that are outside the allowed extent,
          // or closer than 2 * radius to any existing sample.
          if (x >= 0 && x < width && y >= 0 && y < height && far(x, y))
            return sample(x, y)
        }

        queue[i] = queue[--queueSize]
        queue.length = queueSize
      }
    }

    function far(x, y) {
      let i = x / cellSize | 0
      let j = y / cellSize | 0
      let i0 = Math.max(i - 2, 0)
      let j0 = Math.max(j - 2, 0)
      let i1 = Math.min(i + 3, gridWidth)
      let j1 = Math.min(j + 3, gridHeight)

      for (j = j0; j < j1; ++j) {
        let o = j * gridWidth
        for (i = i0; i < i1; ++i) {
          if (s = grid[o + i]) {
            var s
            let dx = s[0] - x
            let dy = s[1] - y
            if (dx * dx + dy * dy < radius2)
              return false
          }
        }
      }

      return true
    }

    function sample(x, y) {
      let s = [x, y]
      queue.push(s)
      grid[gridWidth * (y / cellSize | 0) + (x / cellSize | 0)] = s
      ++sampleSize
      ++queueSize
      return s
    }
  }
}

// Clear the map on re-generation
function undraw() {
  // Remove all on regenerate
  $('g').remove()
  $('path').remove()
  // Set some options to defaults
  heightInput.value = 0.9
  heightOutput.value = 0.9
  radiusInput.value = 0.9
  radiusOutput.value = 0.9
}
