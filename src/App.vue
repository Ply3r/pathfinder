<script>
  import { ALGORITHMS, search, solve } from './search'
  import { generateMaze } from './maze'
  import RangeSlider from './components/RangeSlider.vue'

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const key = (r, c) => `${r},${c}`

  export default {
    components: { RangeSlider },
    data() {
      return {
        drawing: false,
        status: "idle", // idle | running | found | not_found
        run_id: 0,
        algorithm: "astar",
        results: {}, // por algoritmo: { found, steps, searched } para o tabuleiro atual
        pencil_type: "draw",
        pencil_value: "wall",
        speed: 10, // atraso em ms entre os passos da busca
        maze_size: 25, // sempre impar (o gerador de labirinto exige)
        size_input: 25, // valor do slider enquanto ele e arrastado
        start_pos: [0, 0],
        end_pos: [null, null],
        walls: [],
        frontier: new Set(),
        visited: new Set(),
        shortest: new Set(),
        path_length: 0
      }
    },
    computed: {
      busy() {
        return this.status === "running";
      },
      algorithmOptions() {
        return Object.entries(ALGORITHMS).map(([value, { label }]) => ({ title: label, value }));
      },
      algorithmInfo() {
        return ALGORITHMS[this.algorithm];
      },
      // Linhas da tabela de comparacao, na ordem dos algoritmos, so as ja executadas.
      resultRows() {
        const found = Object.values(this.results).filter((r) => r.found);
        const best_steps = Math.min(...found.map((r) => r.steps));
        const best_searched = Math.min(...found.map((r) => r.searched));

        return Object.entries(ALGORITHMS)
          .filter(([key]) => this.results[key])
          .map(([key, { label }]) => {
            const { found: ok, steps, searched } = this.results[key];
            return {
              key,
              label,
              found: ok,
              steps,
              extra_steps: ok ? steps - best_steps : 0,
              searched,
              best_steps: ok && steps === best_steps,
              best_searched: ok && searched === best_searched
            };
          });
      }
    },
    mounted() {
      this.makeMaze();
      window.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.stopDrawing);
      window.addEventListener('pointercancel', this.stopDrawing);
    },
    beforeUnmount() {
      this.run_id += 1; // interrompe uma busca em andamento
      window.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.stopDrawing);
      window.removeEventListener('pointercancel', this.stopDrawing);
    },
    methods: {
      resetBoard(walls) {
        this.walls = walls;
        this.start_pos = [0, 0];
        this.end_pos = [this.maze_size - 1, this.maze_size - 1];
        this.results = {};
        this.clearPath();
      },
      makeMaze() {
        this.resetBoard(Array.from({ length: this.maze_size }, () => new Array(this.maze_size).fill(false)));
      },
      generateMaze() {
        if (this.busy) return;
        this.resetBoard(generateMaze(this.maze_size));
      },
      applySize() {
        if (this.busy || this.size_input === this.maze_size) return;
        this.maze_size = this.size_input;
        this.makeMaze();
      },
      clearPath() {
        this.run_id += 1; // cancela qualquer busca em andamento
        this.status = "idle";
        this.frontier = new Set();
        this.visited = new Set();
        this.shortest = new Set();
        this.path_length = 0;
      },
      tileFromPoint(x, y) {
        const element = document.elementFromPoint(x, y);
        if (!element || !element.classList.contains('tile')) return null;

        const [row, column] = element.id.split('_');
        return [+row, +column];
      },
      onPointerDown(event) {
        const tile = this.tileFromPoint(event.clientX, event.clientY);
        if (!tile) return; // clique fora do tabuleiro (painel, botoes) nao desenha

        this.drawing = true;
        this.draw(...tile);
      },
      onPointerMove(event) {
        if (!this.drawing) return;

        const tile = this.tileFromPoint(event.clientX, event.clientY);
        if (tile) this.draw(...tile);
      },
      stopDrawing() {
        this.drawing = false;
      },
      draw(r_index, c_index) {
        if (this.busy) return;

        const is_start = r_index === this.start_pos[0] && c_index === this.start_pos[1];
        const is_end = r_index === this.end_pos[0] && c_index === this.end_pos[1];

        if (this.pencil_type === 'erase') {
          this.setWall(r_index, c_index, false);
          return;
        }

        if (this.pencil_value === 'wall') {
          if (is_start || is_end) return;
          this.setWall(r_index, c_index, true);
        }

        if (this.pencil_value === 'start') {
          if (is_end || this.walls[r_index][c_index]) return;
          this.start_pos = [r_index, c_index];
          this.results = {};
          this.clearPath();
        }

        if (this.pencil_value === 'end') {
          if (is_start || this.walls[r_index][c_index]) return;
          this.end_pos = [r_index, c_index];
          this.results = {};
          this.clearPath();
        }
      },
      setWall(r_index, c_index, value) {
        if (this.walls[r_index][c_index] === value) return;

        const new_row = [...this.walls[r_index]];
        new_row[c_index] = value;
        this.walls[r_index] = new_row;
        this.results = {};
        this.clearPath(); // o resultado anterior deixou de valer
      },
      searchParams() {
        return {
          rows: this.maze_size,
          cols: this.maze_size,
          isWall: (r, c) => this.walls[r][c],
          start: this.start_pos,
          end: this.end_pos
        };
      },
      // Roda todos os algoritmos de uma vez, sem animar, no tabuleiro atual.
      compare() {
        if (this.busy) return;
        this.clearPath();

        const results = {};
        Object.keys(ALGORITHMS).forEach((key) => {
          const { found, steps, searched } = solve(key, this.searchParams());
          results[key] = { found, steps, searched };
        });
        this.results = results;
      },
      selectAlgorithm(key) {
        if (!this.busy) this.algorithm = key;
      },
      stop() {
        this.clearPath();
      },
      async start() {
        if (this.busy) return;
        this.clearPath();

        const run_id = this.run_id;
        this.status = "running";

        const run = search(this.algorithm, this.searchParams());

        const frontier = new Set();
        const visited = new Set();

        let step;
        while (!(step = run.next()).done) {
          if (run_id !== this.run_id) return; // parou, limpou ou desmontou

          visited.add(key(...step.value.visited));
          step.value.opened.forEach((cell) => frontier.add(key(...cell)));
          this.visited = new Set(visited);
          this.frontier = new Set(frontier);

          if (this.speed > 0) await sleep(this.speed);
          else await new Promise(requestAnimationFrame);
        }

        if (run_id !== this.run_id) return;

        const { found, path } = step.value;
        this.shortest = new Set(path.map((cell) => key(...cell)));
        this.path_length = Math.max(path.length - 1, 0);
        this.status = found ? "found" : "not_found";
        this.results = {
          ...this.results,
          [this.algorithm]: { found, steps: found ? path.length - 1 : null, searched: visited.size }
        };
      }
    }
  }
</script>

<template>
  <div class="container">
    <div class="panel">
      <v-row>
        <v-col>
          <v-btn v-if="!busy" block color="success" @click="start">Start</v-btn>
          <v-btn v-else block color="error" @click="stop">Stop</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6">
          <v-btn block :disabled="busy" @click="clearPath">Clear path</v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn block :disabled="busy" @click="makeMaze">Clear maze</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn block color="teal-darken-2" :disabled="busy" @click="generateMaze">Generate maze</v-btn>
        </v-col>
      </v-row>
      <div class="algorithm_field">
        <v-select
          v-model="algorithm"
          :items="algorithmOptions"
          :disabled="busy"
          label="Algorithm"
          density="compact"
          variant="outlined"
          hide-details
        ></v-select>
        <div class="algorithm_info">
          <span class="algorithm_badge" :class="algorithmInfo.optimal ? 'badge_optimal' : 'badge_not_optimal'">
            {{ algorithmInfo.optimal ? "shortest path" : "may not be shortest" }}
          </span>
          <span>{{ algorithmInfo.description }}</span>
        </div>
        <v-btn block class="mt-3" variant="tonal" :disabled="busy" @click="compare">Compare all</v-btn>
      </div>
      <v-row>
        <v-col class="my-5 d-flex justify-center">
          <button
            class="mx-2 pencil_button wall_pencil"
            @click="pencil_value = 'wall'"
            :class="{ pencil_active: pencil_value === 'wall' }"
          ></button>
          <button
            class="mx-2 pencil_button start_pencil"
            @click="pencil_value = 'start'"
            :class="{ pencil_active: pencil_value === 'start' }"
          ></button>
          <button
            class="mx-2 pencil_button end_pencil"
            @click="pencil_value = 'end'"
            :class="{ pencil_active: pencil_value === 'end' }"
          ></button>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn-toggle v-model="pencil_type" class="d-flex justify-center">
            <v-btn value="draw">
              <v-icon>mdi-pencil</v-icon>
            </v-btn>

            <v-btn value="erase">
              <v-icon>mdi-eraser-variant</v-icon>
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
      <RangeSlider
        v-model="size_input"
        label="Grid size"
        :value-text="`${size_input} × ${size_input}`"
        hint="clears the board"
        :min="11"
        :max="51"
        :step="2"
        :disabled="busy"
        @change="applySize"
      />
      <RangeSlider
        v-model="speed"
        label="Delay"
        :value-text="`${speed} ms`"
        hint="lower is faster"
        :min="0"
        :max="200"
        :step="5"
      />
      <v-alert v-if="status === 'found'" class="status" type="success" density="compact">
        Path found: {{ path_length }} steps ({{ visited.size }} tiles searched)
      </v-alert>
      <v-alert v-else-if="status === 'not_found'" class="status" type="warning" density="compact">
        No path found
      </v-alert>
      <table v-if="resultRows.length" class="results">
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Steps</th>
            <th>Searched</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in resultRows"
            :key="row.key"
            :class="{ results_active: row.key === algorithm }"
            @click="selectAlgorithm(row.key)"
          >
            <td>{{ row.label }}</td>
            <td :class="{ results_best: row.best_steps }">
              <template v-if="row.found">
                {{ row.steps }}<small v-if="row.extra_steps" class="results_worse">+{{ row.extra_steps }}</small>
              </template>
              <template v-else>no path</template>
            </td>
            <td :class="{ results_best: row.best_searched }">{{ row.searched }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      class="distance_board"
      :style="{ gridTemplateColumns: `repeat(${maze_size}, 1fr)`, gridTemplateRows: `repeat(${maze_size}, 1fr)` }"
    >
      <div
        v-for="(row, r_index) in walls"
        :key="r_index + '- row'"
        class="row"
      >
        <div
          v-for="(wall, c_index) in row"
          :id="r_index + '_' + c_index"
          :key="r_index + '_' + c_index"
          draggable="false"
          :class="{
            tile: true,
            wall: wall,
            search_path: frontier.has(`${r_index},${c_index}`),
            visited_path: visited.has(`${r_index},${c_index}`),
            short_path: shortest.has(`${r_index},${c_index}`),
            start: r_index === start_pos[0] && c_index === start_pos[1],
            end: r_index === end_pos[0] && c_index === end_pos[1],
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  position: relative;
  overflow-x: hidden;
}

.container {
  --board-size: min(800px, calc(100vw - 32px), calc(100vh - 32px));

  min-height: 100vh;
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background-color: rgb(179, 205, 196);
}

.panel {
  width: 300px;
  max-width: 100%;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
}

.distance_board {
  width: var(--board-size);
  height: var(--board-size);
  background: white;
  border: 4px solid black;
  display: grid;
  touch-action: none;
  user-select: none;
}

.row {
  display: contents;
}

.tile {
  background-color: white;
  min-width: 0;
  min-height: 0;
}

.status {
  margin-top: 16px;
}

.algorithm_field {
  margin: 20px 0 8px;
}

.algorithm_info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.algorithm_badge {
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
  color: white;
}

.badge_optimal {
  background: rgb(0, 150, 110);
}

.badge_not_optimal {
  background: rgb(200, 110, 20);
}

.results {
  width: 100%;
  margin-top: 16px;
  border-collapse: collapse;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.results th {
  padding: 4px 6px;
  text-align: left;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
}

.results td {
  padding: 5px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.results tbody tr {
  cursor: pointer;
}

.results tbody tr:hover {
  background: rgba(255, 255, 255, 0.5);
}

.results_active td:first-child {
  font-weight: 700;
}

.results_active {
  background: rgba(255, 255, 255, 0.7);
}

.results_best {
  font-weight: 700;
  color: rgb(0, 120, 85);
}

.results_worse {
  margin-left: 4px;
  color: rgb(200, 110, 20);
  font-weight: 600;
}

.pencil_active {
  filter: opacity(50%);
}

.pencil_button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid white;
}

.wall_pencil {
  background-color: black;
}

.start_pencil {
  background-color: greenyellow;
}

.end_pencil {
  background-color: red;
}

.search_path {
  background-color: aquamarine;
}

.wall {
  background-color: black;
}

.visited_path {
  background-color: blue;
}

.short_path {
  background-color: rgb(0, 192, 86);
}

.start {
  background-color: greenyellow;
}

.end {
  background-color: red;
}

/* Telas estreitas: tabuleiro em cima ocupando a largura, painel embaixo */
@media only screen and (max-width: 900px) {
  .container {
    --board-size: min(800px, calc(100vw - 32px));

    flex-direction: column-reverse;
    justify-content: flex-start;
  }

  .panel {
    width: min(480px, 100%);
  }
}
</style>
