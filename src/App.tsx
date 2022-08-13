import React, { useEffect } from "react";
import create from "zustand"
import shallow from "zustand/shallow"
import styled from "styled-components"

enum GameState {
  START,
  PAUSE,
  GAME_OVER
}

type CurrentPiece = {
  type: string,
  position: number[]
  piece: any
}

interface State {
  gameState: GameState
  level: number
  line: number
  score: number

  matrix: any[][]
  pieceQueue: any[]
  currentPiece: CurrentPiece

  addScore: (added: number) => void
  gameLoop: () => any
  viewMatrix: () => any[][]
}

const LINES_EACH_LEVEL = 20

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

const PIECES : any = {
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

// const pieceTypes = Object.keys(pieces)
// const getPieceType = () => pieceTypes[Math.floor(Math.random() * 7)]
const getPiece = (type: string) => PIECES[type][0]
const getCurrentPiece = (type: string): CurrentPiece => ({
  type,
  position: [0, 3],
  piece: getPiece(type),
})

const buildLine = () => new Array(MATRIX_WIDTH).fill(null)
const buildMatrix = () => new Array(MATRIX_HEIGHT).fill(null).map(() => buildLine())

const move = (currentPiece: CurrentPiece, func) => {
  return {
    ...currentPiece,
    position: func(currentPiece.position)
  }
}

const moveDown = (currentPiece: CurrentPiece) => {
  return move(currentPiece, ([x, y]) => [x + 1, y])
}

const moveLeft = (currentPiece: CurrentPiece) => {
  return move(currentPiece, ([x, y]) => [x, y - 1])
}

const moveRight = (currentPiece: CurrentPiece) => {
  return move(currentPiece, ([x, y]) => [x, y + 1])
}

const addPieceTo = (matrix: any[][], currentPiece: CurrentPiece): any[][] => {
  const [x, y] = currentPiece.position
  if (x < matrix.length && y < matrix[x].length) {
    for (let i = 0; i < currentPiece.piece.length; i++) {
      for (let j = 0; j < currentPiece.piece[i].length; j++) {
        if (x + i < matrix.length && y + j < matrix[0].length && currentPiece.piece[i][j]) {
          matrix[x + i][y + j] = currentPiece.type
        }
      }
    }
  }

  return matrix
}

const useGame = create<State>((set, get) => ({
  gameState: GameState.START,
  level: 1,
  line: 0,
  score: 0,

  matrix: buildMatrix(),
  currentPiece: getCurrentPiece("S"),
  pieceQueue: [],

  addScore(added: number) {
    set(state => ({ score: state.score + added }))
  },
  gameLoop() {
    const ref = setInterval(() => {
      set(state => ({ currentPiece: moveDown(state.currentPiece)}))

      // if piece is locked, clear line, add score, update level
    }, get().level * 1000)

    return () => {
      clearInterval(ref)
    }
  },
  viewMatrix() {
    const { matrix, currentPiece } = get()

    return addPieceTo(matrix.map(row => [...row]), currentPiece)
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
    gameState,
    gameLoop,
    level,
    viewMatrix
  } = useGame(state => state , shallow)

  useEffect(gameLoop, [gameLoop, gameState, level])

  return (
    <div className="App">
      <header className="App-header">React Tetris</header>
      <Matrix matrix={viewMatrix()} />
    </div>
  );
}

export default App;