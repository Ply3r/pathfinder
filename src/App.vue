<script>
  import { aStar } from './astar'

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const key = (r, c) => `${r},${c}`

  export default {
    data() {
      return {
        drawing: false,
        status: "idle", // idle | running | found | not_found
        run_id: 0,
        pencil_type: "draw",
        pencil_value: "wall",
        speed: 10, // atraso em ms entre os passos da busca
        maze_size: 25,
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
      makeMaze() {
        this.walls = Array.from({ length: this.maze_size }, () => new Array(this.maze_size).fill(false));
        this.start_pos = [0, 0];
        this.end_pos = [this.maze_size - 1, this.maze_size - 1];
        this.clearPath();
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
          this.clearPath();
        }

        if (this.pencil_value === 'end') {
          if (is_start || this.walls[r_index][c_index]) return;
          this.end_pos = [r_index, c_index];
          this.clearPath();
        }
      },
      setWall(r_index, c_index, value) {
        if (this.walls[r_index][c_index] === value) return;

        const new_row = [...this.walls[r_index]];
        new_row[c_index] = value;
        this.walls[r_index] = new_row;
        this.clearPath(); // o resultado anterior deixou de valer
      },
      stop() {
        this.clearPath();
      },
      async start() {
        if (this.busy) return;
        this.clearPath();

        const run_id = this.run_id;
        this.status = "running";

        const search = aStar({
          rows: this.maze_size,
          cols: this.maze_size,
          isWall: (r, c) => this.walls[r][c],
          start: this.start_pos,
          end: this.end_pos
        });

        const frontier = new Set();
        const visited = new Set();

        let step;
        while (!(step = search.next()).done) {
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
        <v-col md="6">
          <v-btn block :disabled="busy" @click="clearPath">Clear path</v-btn>
        </v-col>
        <v-col md="6">
          <v-btn block :disabled="busy" @click="makeMaze">Clear maze</v-btn>
        </v-col>
      </v-row>
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
      <v-row>
        <v-col>
          <v-slider
            v-model="speed"
            :label="`Delay: ${speed} ms`"
            min="0"
            max="200"
            step="5"
            hide-details
          ></v-slider>
        </v-col>
      </v-row>
      <v-alert v-if="status === 'found'" class="status" type="success" density="compact">
        Path found: {{ path_length }} steps ({{ visited.size }} tiles searched)
      </v-alert>
      <v-alert v-else-if="status === 'not_found'" class="status" type="warning" density="compact">
        No path found
      </v-alert>
    </div>
    <div class="distance_board">
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
  overflow: hidden;
}

body {
  position: relative;
}

.panel {
  top: 10%;
  left: 5%;
  width: 20vw;
  position: absolute;
}

.container {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  background-color: rgb(179, 205, 196);
}

.distance_board {
  width: 800px;
  height: 800px;
  background: white;
  border: 5px solid black;
  display: grid;
  touch-action: none;
  user-select: none;
}

.status {
  margin-top: 16px;
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

.row {
  display: flex;
}

.tile {
  background-color: white;
  width: 100%;
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

@media only screen and (max-width: 600px) {
  /* Your CSS styles for phones go here */

  .panel {
    top: 50%;
    left: 10%;
    width: 80vw;
    position: absolute;
  }

  .container {
    place-items: start;
    padding: 10px;
  }

  .distance_board { 
    width: 95vw;
    height: 45vh;
  }
}


</style>
