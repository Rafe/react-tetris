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
  position: [number, number]
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

const generatePiece = (type: string): number[][] => {
  switch(type) {
    case "I":
      return [
        [1],
        [1],
        [1],
        [1],
      ]
    case "L":
      return [
        [1, 0],
        [1, 0],
        [1, 1],
      ]
    case "J":
      return [
        [0, 1],
        [0, 1],
        [1, 1],
      ]
    case "Z":
      return [
        [1, 1, 0],
        [0, 1, 1],
      ]
    case "S":
      return [
        [0, 1, 1],
        [1, 1, 0],
      ]
    case "O":
      return [
        [1, 1],
        [1, 1],
      ]
    case "T":
      return [
        [1, 1, 1],
        [0, 1, 0],
      ]
    default:
      throw new Error(`invalid type ${type}`)
  }
}

const pieceTypes = ["I", "L", "J", "Z", "S", "I", "T"]
const getPieceType = () => pieceTypes[Math.floor(Math.random() * pieceTypes.length)]
const getCurrentPiece = (type: string): CurrentPiece => ({
  type,
  position: [0, 3],
  piece: generatePiece(type),
})

const buildLine = () => new Array(MATRIX_WIDTH).fill(null)
const buildMatrix = () => new Array(MATRIX_HEIGHT).fill(null).map(() => buildLine())

const move = (currentPiece: CurrentPiece, func: ([x, y]: [number, number]) => [number, number]) => {
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

const rotate = (currentPiece: CurrentPiece, clockwise = true): CurrentPiece => {
  const piece = currentPiece.piece
  const height = piece.length
  const width = piece[0].length
  const newPiece = Array(width).fill(null).map(() => Array(height).fill(0))

  for(let x = 0; x < height; x++) {
    for(let y = 0; y < width; y++) {
      if (piece[x][y]) {
        if (clockwise) {
          newPiece[y][(height - 1) - x] = piece[x][y]
        } else {
          newPiece[(width - 1) - y][x] = piece[x][y]
        }
      }
    }
  }

  return {
    ...currentPiece,
    piece: newPiece
  }
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
  currentPiece: getCurrentPiece(getPieceType()),
  pieceQueue: [],

  addScore(added: number) {
    set(state => ({ score: state.score + added }))
  },
  gameLoop() {
    const ref = setInterval(() => {
      const {piece, position} = get().currentPiece
      if (position[0] >= MATRIX_HEIGHT - piece.length) {
        set(state => ({ currentPiece: getCurrentPiece(getPieceType())}))
      } else {
        set(state => ({ currentPiece: rotate(moveDown(state.currentPiece), true)}))
      }

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