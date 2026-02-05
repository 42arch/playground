interface PageInfo {
  name: string
  description: string
  url: string
  tags?: string[]
  featured?: boolean
  ai?: boolean
}

const pages: PageInfo[] = [
  {
    name: 'Model Animation',
    description:
      'Demonstrates model movement along paths and animation playback.',
    url: '/pages/1-model-animation/index.html',
    tags: ['Three.js', 'Animation', 'GLTF'],
    featured: true
  },
  {
    name: '3D Blob',
    description:
      'Organic 3D shape creation using Perlin noise and custom shaders.',
    url: '/pages/2-3d-blob/index.html',
    tags: ['Three.js', 'Shader', 'Noise'],
    featured: true
  },
  {
    name: 'Earth',
    description:
      'Realistic Earth visualization with texture mapping and lighting.',
    url: '/pages/3-earth/index.html',
    tags: ['Three.js', 'Globe', 'Texture']
  },
  {
    name: 'Globe',
    description:
      'Interactive globe displaying geographic coordinates and data points.',
    url: '/pages/4-globe/index.html',
    tags: ['Three.js', 'Globe', 'Data Viz']
  },
  {
    name: 'Shaders',
    description: 'Collection of advanced visual effects ported from ShaderToy.',
    url: '/pages/5-shaders/index.html',
    tags: ['Three.js', 'Shader', 'ShaderToy']
  },
  {
    name: 'Procedural Terrain',
    description:
      'Dynamic terrain generation using noise algorithms and heightmaps.',
    url: '/pages/6-procedural-terrain/index.html',
    tags: ['Three.js', 'Terrain', 'Noise']
  },
  {
    name: 'Block Terrain',
    description: 'Voxel-style terrain generated with Fractal Brownian Motion.',
    url: '/pages/7-block-terrain/index.html',
    tags: ['Three.js', 'Terrain', 'Voxel'],
    featured: true
  },
  {
    name: '3D Force Layout',
    description:
      'Dynamic 3D force-directed graph for complex relationship visualization.',
    url: '/pages/8-3d-force-layout/index.html',
    tags: ['Three.js', 'Graph', 'Force-Directed'],
    featured: true
  },
  {
    name: 'Multiple Views',
    description:
      'Simultaneous rendering of different perspectives in a single scene.',
    url: '/pages/9-multiple-views/index.html',
    tags: ['Three.js', 'Camera', 'Viewport']
  },
  {
    name: 'Grayscale Shaders',
    description:
      'Procedural grayscale textures including chessboard, noise, and FBM.',
    url: '/pages/10-grayscale/index.html',
    tags: ['Three.js', 'Shader', 'Noise']
  },
  {
    name: 'Voronoi Algorithm',
    description:
      'Interactive visualization of Voronoi diagrams and Delaunay triangulation.',
    url: '/pages/11-voronoi-demo/index.html',
    tags: ['Canvas', 'Algorithm', 'Geometry']
  },
  {
    name: 'Atmospheric Earth',
    description:
      'Advanced Earth with day/night cycles and atmospheric scattering.',
    url: '/pages/12-shader-earth/index.html',
    tags: ['Three.js', 'Shader', 'Atmosphere'],
    featured: true
  },
  {
    name: 'GPU Picking',
    description:
      'High-performance object selection using GPU-based color ID mapping.',
    url: '/pages/13-gpu-picking/index.html',
    tags: ['Three.js', 'Performance', 'Interaction']
  },
  {
    name: 'Map Generator',
    description:
      'Procedural island maps with elevation, moisture, and river systems.',
    url: '/pages/14-mapgen-webgl-demo/index.html',
    tags: ['OGL', 'Terrain', 'Procedural'],
    featured: true
  },
  {
    name: 'Building Explode',
    description:
      'Interactive 3D building with layering, explode effects, and floor selection.',
    url: '/pages/15-building-explode-effect/index.html',
    tags: ['Three.js', 'Building', 'Interaction'],
    featured: true
  }
]

function createPageCard(page: PageInfo): HTMLElement {
  const card = document.createElement('a')
  card.className = `page-card ${page.featured ? 'featured' : ''}`
  card.href = page.url

  const tagsHtml = page.tags
    ? page.tags
        .map(
          (tag, index) =>
            `<span class="tag ${index === 0 ? 'tech-tag' : ''}">${tag}</span>`
        )
        .join('')
    : ''
  const featuredBadge = page.featured
    ? '<span class="featured-badge">Featured</span>'
    : ''
  const aiBadge = page.ai ? '<span class="ai-badge">AI</span>' : ''

  card.innerHTML = `
    <div class="card-content">
      <div class="card-header">
        <h2 class="card-title">${page.name}</h2>
        <div class="badge-container">
          ${aiBadge}
          ${featuredBadge}
        </div>
      </div>
      <p class="card-description">${page.description}</p>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-arrow">
        View Demo <span>&rarr;</span>
      </div>
    </div>
  `

  return card
}

function renderPages(
  filterFeatured: boolean = false,
  filterAi: boolean = false
) {
  const pagesGrid = document.querySelector('.pages-grid')
  if (!pagesGrid) return

  pagesGrid.innerHTML = ''

  let filteredPages = pages

  if (filterFeatured) {
    filteredPages = filteredPages.filter((page) => page.featured)
  }

  if (filterAi) {
    filteredPages = filteredPages.filter((page) => page.ai)
  }

  filteredPages.forEach((page) => {
    const card = createPageCard(page)
    pagesGrid.appendChild(card)
  })
}

function initializePages() {
  const filterFeaturedToggle = document.getElementById(
    'featured-filter'
  ) as HTMLInputElement
  const filterAiToggle = document.getElementById(
    'ai-filter'
  ) as HTMLInputElement

  const handleChange = () => {
    renderPages(filterFeaturedToggle?.checked, filterAiToggle?.checked)
  }

  if (filterFeaturedToggle) {
    filterFeaturedToggle.addEventListener('change', handleChange)
  }

  if (filterAiToggle) {
    filterAiToggle.addEventListener('change', handleChange)
  }

  renderPages(
    filterFeaturedToggle?.checked || false,
    filterAiToggle?.checked || false
  )
}

// Initialize pages when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePages)
