<script>
  export default {
    data() {
      return {
        mouse_active: false,
        busy: false,
        found_path: false,
        pencil_type: "draw",
        pencil_value: "wall",
        speed: 0,
        maze_size: 25,
        start_pos: [0, 0],
        end_pos: [null, null],
        shortest_path: [],
        visited_paths: [],
        distance_board: []
      }
    },
    mounted() {
      this.makeMaze();
      this.setMouseEvents();
    },
    methods: {
      setMouseEvents() {
        window.addEventListener('mousedown', () => {
          this.mouse_active = true;
        })

        window.addEventListener('mouseup', () => {
          this.mouse_active = false;
        })
      },
      makeMaze() {
        const maze = new Array(this.maze_size).fill(new Array(this.maze_size).fill(Infinity));

        const hold_first_row = [...maze[0]];
        hold_first_row[0] = 0;

        maze[0] = hold_first_row;
        this.end_pos = [maze.length - 1, maze[0].length - 1];
        this.distance_board = maze;

        this.clearMaze();
      },
      clearMaze() {
        this.shortest_path = [];
        this.visited_paths = [];
        this.distance_board = this.distance_board.map((row) => row.map((col) => col !== null ? Infinity : col))
      },
      draw(r_index, c_index) {
        if (!this.mouse_active) return;

        if(this.pencil_type === 'erase') {
          const new_row = [...this.distance_board[r_index]];
          new_row[c_index] = Infinity;

          this.distance_board[r_index] = new_row;
          return;
        }

        if (this.pencil_value === 'wall') {
          const is_start = r_index === this.start_pos[0] && c_index === this.start_pos[1]
          const is_end = r_index === this.end_pos[0] && c_index === this.end_pos[1]
          if (is_start || is_end) return;

          const new_row = [...this.distance_board[r_index]];
          new_row[c_index] = null;

          this.distance_board[r_index] = new_row;
        }

        if (this.pencil_value === 'start') {
          this.start_pos = [r_index, c_index];
        }

        if (this.pencil_value === 'end') {
          this.end_pos = [r_index, c_index];
        }
      },
      calc_g_cost(next_move, start_pos) {
        return (Math.abs(next_move[0] - start_pos[0]) * 5) + (Math.abs(next_move[1] - start_pos[1]) * 5 );
      },
      calc_h_cost(next_move, end_pos) {
        return (Math.abs(next_move[0] - end_pos[0]) * 10) + (Math.abs(next_move[1] - end_pos[1]) * 10 );
      },
      mapPossibleMoves(pos, moves) {
        let new_moves = [
          [pos[0] - 1, pos[1]],
          [pos[0] + 1, pos[1]],
          [pos[0], pos[1] - 1],
          [pos[0], pos[1] + 1],
        ];
        
        new_moves = new_moves.filter((next_move) => {
          if ([undefined, null].includes(this.distance_board[next_move[0]])) return false;
          if ([undefined, null].includes(this.distance_board[next_move[0]][next_move[1]])) return false;
          return true;
        })

        new_moves.forEach((next_move) => {
          const g_cost = this.calc_g_cost(next_move, this.start_pos);
          const h_cost = this.calc_h_cost(next_move, this.end_pos);
          const distance = g_cost + h_cost;

          const hold_row = [...this.distance_board[next_move[0]]];
          hold_row[next_move[1]] = distance;

          this.distance_board[next_move[0]] = hold_row;
        });

        new_moves = [...moves, ...new_moves].filter((next_move) => !this.visited_paths.includes(next_move.toString()));
        return new_moves;
      },
      sortBestMove(moves, distance_board) {
        moves.sort((a, b) => {
          const dist_a = distance_board[a[0]][a[1]];
          const dist_b = distance_board[b[0]][b[1]];

          if (dist_a === dist_b) return Math.abs(a[0] - a[1]) - Math.abs(b[0] - b[1]);
          return dist_a - dist_b;
        })
      },
      findShortestPath() {
        const shortest = [];
        let visited = [...this.visited_paths];
        let pos = [...this.end_pos];


        while (visited.length) {
          const moves = [
            [pos[0] - 1, pos[1]],
            [pos[0] + 1, pos[1]],
            [pos[0], pos[1] - 1],
            [pos[0], pos[1] + 1],
          ].filter((new_move) => this.visited_paths.includes(new_move.toString()));
            
          const [lastIndex] = moves
            .map((move) => this.visited_paths.findIndex((p) => p === move.toString()))
            .sort((a, b) => a - b);

          if (lastIndex === -1) break

          shortest.push(pos.toString());
          pos = this.visited_paths[lastIndex].split(',').map((n) => +n);
          visited = visited.slice(0, lastIndex);
        }

        this.shortest_path = [...shortest];
      },
      async findPath(possible_moves, pos, end_pos_value) {
        if (!pos) return;
        const pos_value = pos.toString();

        if (pos_value === end_pos_value) {
          this.found_path = true;
          this.busy = false;
          this.findShortestPath();
          throw new Error(true); // break the stack
        }

        
        this.visited_paths = [...this.visited_paths, pos_value];
        possible_moves = this.mapPossibleMoves(pos, possible_moves);
        this.sortBestMove(possible_moves, this.distance_board);

        setTimeout(() => {
          this.findPath(possible_moves, possible_moves[0], end_pos_value);
        }, this.speed);
      },
      async start() {
        const end_pos_value = this.end_pos.toString();
        let possible_moves = [];
        this.found_path = false;
        this.busy = true;

        this.findPath(possible_moves, this.start_pos, end_pos_value)
      }
    }
  }
</script>

<template>
  <div class="container">
    <div class="panel">
      <v-row>
        <v-col>
          <v-btn block color="success" @click="start">Start</v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col md="6">
          <v-btn block @click="clearMaze">Clear path</v-btn>
        </v-col>
        <v-col md="6">
          <v-btn block @click="makeMaze">Clear maze</v-btn>
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
    </div>
    <div class="distance_board">
      <div 
        v-for="(row, r_index) in distance_board"
        :key="r_index + '- row'"
        class="row"
      >
        <div 
          v-for="(col, c_index) in row"
          :key="c_index + '- col - ' + r_index + ' - row'"
          @mouseover="draw(r_index, c_index)"
          draggable="false"
          :class="{ 
            tile: true,
            wall: col === null, 
            search_path: col !== Infinity && col !== null,
            visited_path: visited_paths.includes(`${r_index},${c_index}`), 
            short_path: shortest_path.includes(`${r_index},${c_index}`),
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
  grid-template-columns: repeat(1fr, 50);
  grid-template-rows: repeat(1fr, 50);
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

</style>
