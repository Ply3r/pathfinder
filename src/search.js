// Algoritmos de busca de caminho em grade 4-direcional com custo unitario.
//
// Todos sao geradores: cada `yield` e um passo da busca (um no expandido), o que
// permite animar a busca passo a passo. O valor retornado ao final e { found, path }.
//
//   const run = search("astar", { rows, cols, isWall, start, end })
//   let step
//   while (!(step = run.next()).done) { step.value.visited, step.value.opened }
//   const { found, path } = step.value
//
// `solve` roda ate o fim sem animar e devolve tambem quantos nos foram expandidos.

export const ALGORITHMS = {
  astar: { label: "A*", optimal: true, description: "Dijkstra guided by a heuristic" },
  dijkstra: { label: "Dijkstra", optimal: true, description: "Expands by cost, no heuristic" },
  bfs: { label: "BFS", optimal: true, description: "Breadth-first, layer by layer" },
  greedy: { label: "Greedy", optimal: false, description: "Only looks at the distance to the end" },
  dfs: { label: "DFS", optimal: false, description: "Depth-first, goes as deep as it can" }
}

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

class Queue {
  constructor() {
    this.items = []
    this.head = 0
  }

  get size() {
    return this.items.length - this.head
  }

  push(item) {
    this.items.push(item)
  }

  pop() {
    return this.items[this.head++]
  }
}

class Stack {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(item) {
    this.items.push(item)
  }

  pop() {
    return this.items.pop()
  }
}

// Ordem em que os vizinhos sao gerados (cima, baixo, esquerda, direita).
const MOVES = [[-1, 0], [1, 0], [0, -1], [0, 1]]

// Como cada algoritmo ordena a fronteira e trata um no ja descoberto:
//  - relax: pode corrigir o pai/custo se achar um caminho melhor (A*, Dijkstra)
//  - priority: valor que a fila de prioridade minimiza
const STRATEGIES = {
  astar: {
    relax: true,
    frontier: () => new MinHeap((a, b) => a.f - b.f || b.g - a.g || a.seq - b.seq),
    priority: (g, h) => g + h
  },
  dijkstra: {
    relax: true,
    frontier: () => new MinHeap((a, b) => a.f - b.f || a.seq - b.seq),
    priority: (g) => g
  },
  greedy: {
    relax: false,
    frontier: () => new MinHeap((a, b) => a.f - b.f || a.seq - b.seq),
    priority: (g, h) => h
  },
  bfs: { relax: false, frontier: () => new Queue(), priority: () => 0 },
  dfs: { relax: false, frontier: () => new Stack(), priority: () => 0 }
}

export function* search(algorithm, { rows, cols, isWall, start, end }) {
  const strategy = STRATEGIES[algorithm]
  if (!strategy) throw new Error(`algoritmo desconhecido: ${algorithm}`)

  const index = (r, c) => r * cols + c
  const heuristic = (r, c) => Math.abs(r - end[0]) + Math.abs(c - end[1])

  const startIndex = index(...start)
  const endIndex = index(...end)

  const g = new Float64Array(rows * cols).fill(Infinity)
  const parent = new Int32Array(rows * cols).fill(-1)
  const seen = new Uint8Array(rows * cols) // ja descoberto (entrou na fronteira)
  const closed = new Uint8Array(rows * cols) // ja expandido

  const frontier = strategy.frontier()
  let seq = 0
  const enqueue = (r, c, cost) => {
    const f = strategy.priority(cost, heuristic(r, c))
    frontier.push({ index: index(r, c), f, g: cost, seq: seq++ })
  }

  g[startIndex] = 0
  seen[startIndex] = 1
  enqueue(...start, 0)

  while (frontier.size) {
    const current = frontier.pop()
    if (closed[current.index]) continue // entrada velha da fronteira
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

    // A pilha devolve o ultimo empilhado primeiro, entao no DFS invertemos a ordem
    // para que o primeiro movimento da lista seja o explorado primeiro.
    const moves = algorithm === "dfs" ? [...MOVES].reverse() : MOVES

    for (const [dr, dc] of moves) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue
      if (isWall(nr, nc)) continue

      const next = index(nr, nc)
      if (closed[next]) continue

      const cost = g[current.index] + 1

      if (algorithm === "dfs") {
        // O pai e o ultimo no que empilhou este vizinho (comportamento classico do DFS).
        g[next] = cost
        parent[next] = current.index
      } else if (strategy.relax) {
        if (cost >= g[next]) continue
        g[next] = cost
        parent[next] = current.index
      } else {
        if (seen[next]) continue // BFS e Greedy nunca revisam um no descoberto
        g[next] = cost
        parent[next] = current.index
      }

      if (!seen[next]) {
        seen[next] = 1
        opened.push([nr, nc])
      }
      enqueue(nr, nc, cost)
    }

    yield { visited: [r, c], opened }
  }

  return { found: false, path: [] }
}

// Roda a busca inteira sem animar. `searched` = nos expandidos; `steps` = movimentos do caminho.
export function solve(algorithm, params) {
  const run = search(algorithm, params)
  let searched = 0
  let step
  while (!(step = run.next()).done) searched += 1

  const { found, path } = step.value
  return { found, path, searched, steps: found ? path.length - 1 : null }
}
