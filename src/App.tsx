import React from "react";
import create from "zustand"
import shallow from "zustand/shallow"
import styled from "styled-components"

import './App.css';

enum Status {
  START,
  PAUSE,
  GAME_OVER
}

interface GameState {
  score: number
  line: number
  state: Status
  matrix: any[][]
  pieceQueue: []
  currentPiece: []
  addScore: (added: number) => void
}

const LINES_EACH_LEVEL = 20

// initialize game state:
// { score, line, gameState: START | PAUSE | GAME_OVER,
//   matrix, nextPieceQueue, currentPiece }

// when game state is GAME_OVER or PAUSE, press start to start the game
// when game state is START, running game loop 
// the current piece fall by game speed
//   when falling, show the future position that the piece will fall
//   when piece can not move when fall, lock piece
//   when piece fill the line, remove the line, stop fall for a tick, add score based on speed and line removed
//   when line over the threshold increase speed level
//   then pop next piece from queue, when there is no space for piece, set game state to GAME_OVER
//   while falling, controller take control of the piece
//     left, right, down, drop, rotate right, rotate left, pause

const MATRIX_WIDTH = 10
const MATRIX_HEIGHT = 20

const buildLine = () => new Array(MATRIX_WIDTH).fill(null)
const buildMatrix = () => new Array(MATRIX_HEIGHT).fill(null).map(() => buildLine())

const useGame = create<GameState>(set => ({
  score: 0,
  line: 0,
  state: Status.START,
  matrix: buildMatrix(),
  pieceQueue: [],
  currentPiece: [],
  addScore(added: number) {
    set(state => ({ score: state.score + added }))
  }
}))

const Block = styled.td<{type: string}>`
  border: 1px solid black;
  width: 20px;
  height: 20px;
  background-color: ${props => props.type ? "black" : "#EEEEEE"}
`

const MatrixTable = styled.table`
  border-collapse: collapse;
`

const Matrix = ({matrix}: {matrix: any[][]}) => (
  <MatrixTable>
    {
    matrix.map(line => (
      <tr>
        {
          line.map(block => (
            <Block type={block} />
          ))
        }
      </tr>
    ))
    }
  </MatrixTable>
)

function App() {
  const { matrix } = useGame(state => ({ score: state.score, matrix: state.matrix, addScore: state.addScore }), shallow)
  return (
    <div className="App">
      <header className="App-header">React Tetris</header>
      <Matrix matrix={matrix} />
    </div>
  );
}

export default App;