// A* em grade 4-direcional com custo unitario e heuristica de Manhattan.
//
// E um gerador: cada `yield` e um passo da busca (um no expandido), o que permite
// animar a busca passo a passo. O valor retornado ao final e { found, path }.
//
//   const search = aStar({ rows, cols, isWall, start, end })
//   let step
//   while (!(step = search.next()).done) { step.value.visited, step.value.opened }
//   const { found, path } = step.value

class MinHeap {
  constructor(compare) {
    this.items = []
    this.compare = compare
  }

  get size() {
    return this.items.length
  }

  push(item) {
    const items = this.items
    items.push(item)
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(items[i], items[parent]) >= 0) break
      ;[items[i], items[parent]] = [items[parent], items[i]]
      i = parent
    }
  }

  pop() {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length) {
      items[0] = last
      let i = 0
      for (;;) {
        const left = 2 * i + 1
        const right = left + 1
        let smallest = i
        if (left < items.length && this.compare(items[left], items[smallest]) < 0) smallest = left
        if (right < items.length && this.compare(items[right], items[smallest]) < 0) smallest = right
        if (smallest === i) break
        ;[items[i], items[smallest]] = [items[smallest], items[i]]
        i = smallest
      }
    }
    return top
  }
}

const MOVES = [[-1, 0], [1, 0], [0, -1], [0, 1]]

export function* aStar({ rows, cols, isWall, start, end }) {
  const index = (r, c) => r * cols + c
  const heuristic = (r, c) => Math.abs(r - end[0]) + Math.abs(c - end[1])

  const startIndex = index(...start)
  const endIndex = index(...end)

  const g = new Float64Array(rows * cols).fill(Infinity)
  const parent = new Int32Array(rows * cols).fill(-1)
  const closed = new Uint8Array(rows * cols)

  // Menor f primeiro; em empate, maior g (mais perto do destino) para expandir menos nos.
  const open = new MinHeap((a, b) => a.f - b.f || b.g - a.g)

  g[startIndex] = 0
  open.push({ index: startIndex, f: heuristic(...start), g: 0 })

  while (open.size) {
    const current = open.pop()
    if (closed[current.index]) continue // entrada velha da fila
    closed[current.index] = 1

    const r = Math.floor(current.index / cols)
    const c = current.index % cols
    const opened = []

    if (current.index === endIndex) {
      const path = []
      for (let i = endIndex; i !== -1; i = parent[i]) {
        path.push([Math.floor(i / cols), i % cols])
      }
      yield { visited: [r, c], opened }
      return { found: true, path: path.reverse() }
    }

    for (const [dr, dc] of MOVES) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
      if (isWall(nr, nc)) continue

      const next = index(nr, nc)
      if (closed[next]) continue

      const tentative = g[current.index] + 1
      if (tentative >= g[next]) continue

      if (g[next] === Infinity) opened.push([nr, nc])
      g[next] = tentative
      parent[next] = current.index
      open.push({ index: next, f: tentative + heuristic(nr, nc), g: tentative })
    }

    yield { visited: [r, c], opened }
  }

  return { found: false, path: [] }
}
