// Gerador de labirinto (backtracker iterativo) em grade size x size.
//
// As "salas" ficam nas coordenadas pares e as paredes entre elas nas impares,
// por isso `size` deve ser impar: assim o canto inferior direito tambem e uma sala
// e sempre existe caminho entre (0, 0) e (size - 1, size - 1).
//
// Um labirinto perfeito tem um unico caminho, o que deixa a busca sem graça.
// `loops` e a fracao de paredes internas removidas ao acaso para criar rotas
// alternativas (assim o caminho mais curto realmente precisa ser procurado).
//
// Retorna uma matriz size x size de booleanos onde `true` e parede.

export function generateMaze(size, { rnd = Math.random, loops = 0.08 } = {}) {
  if (size % 2 === 0) throw new Error('size deve ser impar')

  const walls = Array.from({ length: size }, () => new Array(size).fill(true))
  const visited = new Set()
  const stack = [[0, 0]]

  walls[0][0] = false
  visited.add('0,0')

  while (stack.length) {
    const [r, c] = stack[stack.length - 1]

    const options = [[-2, 0], [2, 0], [0, -2], [0, 2]]
      .map(([dr, dc]) => [r + dr, c + dc, dr, dc])
      .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < size && nc < size && !visited.has(`${nr},${nc}`))

    if (!options.length) {
      stack.pop()
      continue
    }

    const [nr, nc, dr, dc] = options[Math.floor(rnd() * options.length)]
    walls[r + dr / 2][c + dc / 2] = false // abre a parede entre as duas salas
    walls[nr][nc] = false
    visited.add(`${nr},${nc}`)
    stack.push([nr, nc])
  }

  // Paredes internas que separam duas salas (uma coordenada par, a outra impar).
  for (let r = 1; r < size - 1; r += 1) {
    for (let c = 1; c < size - 1; c += 1) {
      const separatesRooms = (r % 2 === 0) !== (c % 2 === 0)
      if (walls[r][c] && separatesRooms && rnd() < loops) walls[r][c] = false
    }
  }

  return walls
}
