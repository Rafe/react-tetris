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
  controller: any
  bindController: any

  matrix: any[][]
  nextPieceType: string
  holdPieceType: string
  currentPiece: CurrentPiece

  gameLoop: () => any
  viewMatrix: () => any[][]
}

const LINES_EACH_LEVEL = 20
const BASE_SCORE_FOR_LINES = [0, 40, 100, 300, 1200]

// when game state is GAME_OVER or PAUSE, enter start to start the game
// when game state is START, running game loop 
//   the current piece fall by game speed
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
        [2],
        [1],
        [1],
      ]
    case "L":
      return [
        [1, 0],
        [2, 0],
        [1, 1],
      ]
    case "J":
      return [
        [0, 1],
        [0, 2],
        [1, 1],
      ]
    case "Z":
      return [
        [1, 2, 0],
        [0, 1, 1],
      ]
    case "S":
      return [
        [0, 2, 1],
        [1, 1, 0],
      ]
    case "O":
      return [
        [2, 1],
        [1, 1],
      ]
    case "T":
      return [
        [1, 2, 1],
        [0, 1, 0],
      ]
    default:
      throw new Error(`invalid type ${type}`)
  }
}

const pieceTypes = ["I", "L", "J", "Z", "S", "O", "T"]
const getPieceType = () => pieceTypes[Math.floor(Math.random() * pieceTypes.length)]
const getCurrentPiece = (type: string): CurrentPiece => {
  const piece = generatePiece(type)
  return {
    type,
    position: [0, Math.floor((MATRIX_WIDTH - piece[0].length)/ 2)],
    piece
  }
}

const getTickSeconds = (level: number): number => (0.8 - (level - 1) * 0.007) ** (level - 1)
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

const hardDrop = (currentPiece: CurrentPiece, matrix: any[][]): CurrentPiece => {
  const droppedPiece: CurrentPiece = {
    ...currentPiece,
    position: [currentPiece.position[0], currentPiece.position[1]]
  }
  while (isEmptyPosition(droppedPiece, matrix)) {
    droppedPiece.position[0] += 1
  }

  droppedPiece.position[0] -= 1

  return droppedPiece
}

const isEmptyPosition = (currentPiece: CurrentPiece, matrix: any[][]): boolean => {
  const { position, piece } = currentPiece

  for(let x = 0; x < piece.length; x++) {
    for(let y = 0; y < piece[0].length; y++) {
      if (!piece[x][y]) {
        continue
      }

      const px = position[0] + x
      const py = position[1] + y

      if (px < 0 || px >= MATRIX_HEIGHT) {
        return false
      } else if (py < 0 || py >= MATRIX_WIDTH) {
        return false
      } else if (matrix[px][py]) {
        return false
      }
    }
  }

  return true
}

const tryMove = (moveMethod: (p: CurrentPiece) => CurrentPiece, matrix: number[][]) => {
  return (currentPiece: CurrentPiece): CurrentPiece => {
    const movedPiece = moveMethod(currentPiece)

    if (isEmptyPosition(movedPiece, matrix)) {
      return movedPiece
    } else {
      return currentPiece
    }
  }
}

const rotate = ({ clockwise }: { clockwise: boolean}) => (currentPiece: CurrentPiece): CurrentPiece => {
  const { piece } = currentPiece
  const height = piece.length
  const width = piece[0].length
  const newPiece = Array(width).fill(null).map(() => Array(height).fill(0))
  let px = 0
  let py = 0

  for(let x = 0; x < height; x++) {
    for(let y = 0; y < width; y++) {
      if (piece[x][y]) {
        if (clockwise) {
          if (piece[x][y] === 2) {
            px = x - y
            py = y - ((height - 1) - x)
          }
          newPiece[y][(height - 1) - x] = piece[x][y]
        } else {
          if (piece[x][y] === 2) {
            px = x - ((width - 1) - y)
            py = y - x
          }
          newPiece[(width - 1) - y][x] = piece[x][y]
        }
      }
    }
  }

  const [originX, originY] = currentPiece.position

  return {
    ...currentPiece,
    position: [originX + px, originY + py],
    piece: newPiece
  }
}

const rotateRight = rotate({ clockwise: true })
const rotateLeft = rotate({ clockwise: false})

const addPieceTo = (matrix: any[][], currentPiece: CurrentPiece): any[][] => {
  const [x, y] = currentPiece.position
  if (x >= 0 && x < matrix.length && y >= 0 && y < matrix[0].length) {
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

const isSamePosition = (currentPiece: CurrentPiece, movedPiece: CurrentPiece): boolean => {
  const [x, y] = currentPiece.position;
  const [mx, my] = movedPiece.position;

  return x === mx && y === my
}

const clearLines = (matrix: any[][]): [number, any[][]] => {
  let lineCleared = 0
  const newMatrix = matrix.reduce((result, line) => {
    if (line.every((block) => block)) {
      lineCleared += 1
      result.unshift(buildLine())
    } else {
      result.push(line)
    }

    return result
  }, [])

  return [lineCleared, newMatrix]
}

const initializeGame = () => ({
  gameState: GameState.START,
  level: 1,
  line: 0,
  score: 0,

  matrix: buildMatrix(),
  currentPiece: getCurrentPiece(getPieceType()),
  nextPieceType: getPieceType(),
  holdPieceType: "",
})

const lockPiece = (currentPiece: CurrentPiece, matrix: any[][], nextPieceType: string, line: number, score: number) => {
  const [lineCleared, newMatrix] = clearLines(addPieceTo(matrix, currentPiece))

  const newLine = line + lineCleared
  const level = Math.floor(newLine / LINES_EACH_LEVEL) + 1
  const nextPiece = getCurrentPiece(nextPieceType);

  return {
    currentPiece: nextPiece,
    matrix: newMatrix,
    line: newLine,
    nextPieceType: getPieceType(),
    gameState: isEmptyPosition(nextPiece, newMatrix) ? GameState.START : GameState.GAME_OVER,
    level,
    score: score + (level * BASE_SCORE_FOR_LINES[lineCleared]) 
  }
}

const useGame = create<State>((set, get) => ({
  ...initializeGame(),
  gameLoop() {
    const ref = setInterval(() => {
      set(({matrix, gameState, line, score, currentPiece, nextPieceType}) => {
        if (gameState === GameState.GAME_OVER || gameState === GameState.PAUSE) {
          return {}
        }

        const movedPiece = tryMove(moveDown, matrix)(currentPiece)

        if (!isSamePosition(currentPiece, movedPiece)) {
          return {
            currentPiece: movedPiece
          }
        }

        return lockPiece(currentPiece, matrix, nextPieceType, line, score)
      })
    }, 1000 * getTickSeconds(get().level))

    return () => {
      clearInterval(ref)
    }
  },
  viewMatrix() {
    const { matrix, currentPiece } = get()
    const viewMatrix = matrix.map(row => [...row])

    return addPieceTo(viewMatrix, currentPiece)
  },
  controller: {
    ArrowUp: () => set(state => ({ currentPiece: tryMove(rotateRight, state.matrix)(state.currentPiece)})),
    ArrowLeft: () => set(state => ({ currentPiece: tryMove(moveLeft, state.matrix)(state.currentPiece)})),
    ArrowRight: () => set(state => ({ currentPiece: tryMove(moveRight, state.matrix)(state.currentPiece)})),
    ArrowDown: () => set(({matrix, currentPiece, line, score, nextPieceType}) => {
      const movedPiece = tryMove(moveDown, matrix)(currentPiece)

      if (!isSamePosition(currentPiece, movedPiece)) {
        return {
          currentPiece: movedPiece
        }
      }

      return lockPiece(currentPiece, matrix, nextPieceType, line, score)
    }),
    KeyZ: () => {
      set(state => ({
        currentPiece: tryMove(rotateLeft, state.matrix)(state.currentPiece)
      }))
    },
    KeyX: () => {
      set(state => ({
        currentPiece: tryMove(rotateRight, state.matrix)(state.currentPiece)
      }))
    },
    Space: () => {
      set(({ currentPiece, matrix, line, score, nextPieceType }) =>
        lockPiece(hardDrop(currentPiece, matrix), matrix, nextPieceType, line, score)
      )
    },
    Enter: () => {
      const {gameState} = get()
      if (gameState === GameState.GAME_OVER) {
        set(state => initializeGame())
      } else if (gameState === GameState.START) {
        set(state => ({ gameState: GameState.PAUSE }))
      } else {
        set(state => ({ gameState: GameState.START }))
      }
    }
  },
  bindController() {
    const { controller, gameState } = get()

    const eventListener = (event: any) => {
      if ([GameState.GAME_OVER, GameState.PAUSE].includes(gameState) && event.code !== "Enter") {
        return
      }

      if (controller[event.code]) {
        controller[event.code]()
      }
    }

    document.addEventListener("keydown", eventListener)
    return () => document.removeEventListener("keydown", eventListener)
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
    bindController,
    level,
    score,
    holdPieceType,
    nextPieceType,
    viewMatrix,
  } = useGame(state => state , shallow)

  useEffect(gameLoop, [gameLoop, gameState, level])
  useEffect(bindController)

  return (
    <div className="App">
      <header className="App-header">React Tetris</header>
      <h5>game state: {gameState}</h5>
      <h5>level: {level}</h5>
      <h5>score: {score}</h5>
      <h5>next: {nextPieceType}</h5>
      <h5>hold: {holdPieceType}</h5>
      <Matrix matrix={viewMatrix()} />
    </div>
  );
}

export default App;