import React, { useEffect } from "react";
import create from "zustand"
import shallow from "zustand/shallow"
import styled from "styled-components"

import './App.css';

enum GameState {
  START,
  PAUSE,
  GAME_OVER
}

interface State {
  score: number
  line: number
  gameState: GameState
  matrix: any[][]
  pieceQueue: any[]
  piece: any[][]
  level: number
  addScore: (added: number) => void
  gameLoop: () => any
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

const pieces : any = {
  I: [
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0]
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0]
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0]
    ]
  ],
  L: [
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  ],
  J: [
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0]
    ]
  ],
  Z: [
    [
      [0, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [1, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ]
  ],
  S: [
    [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 0]
    ]
  ],
  O: [
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
  ],
  T: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 0]
    ]
  ]
}

const pieceTypes = Object.keys(pieces)
const getPiece = () => pieces[pieceTypes[Math.floor(Math.random() * 7)]][0]

const buildLine = () => new Array(MATRIX_WIDTH).fill(null)
const buildMatrix = () => new Array(MATRIX_HEIGHT).fill(null).map(() => buildLine())

const useGame = create<State>(set => ({
  score: 0,
  line: 0,
  gameState: GameState.START,
  matrix: buildMatrix(),
  piece: getPiece(),
  pieceQueue: [getPiece(), getPiece(), getPiece(), getPiece()],
  level: 1,
  addScore(added: number) {
    set(state => ({ score: state.score + added }))
  },
  gameLoop() {
    const ref = setInterval(() => {
      console.log("tick")
    }, 1000)

    return () => clearInterval(ref)
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
    <tbody>
      {
      matrix.map((line, i) => (
        <tr key={`line-${i}`}>
          {
            line.map((block, j) => (
              <Block key={`block-${i}-${j}`} type={block} />
            ))
          }
        </tr>
      ))
      }
    </tbody>
  </MatrixTable>
)

function App() {
  const {
    matrix,
    gameState,
    gameLoop,
    level,
    piece,
  } = useGame(state => state , shallow)

  useEffect(gameLoop, [gameState, level])

  console.log(piece)

  return (
    <div className="App">
      <header className="App-header">React Tetris</header>
      <Matrix matrix={matrix} />
    </div>
  );
}

export default App;