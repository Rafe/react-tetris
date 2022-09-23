import React, { useEffect } from "react";
import create from "zustand"
import shallow from "zustand/shallow"
import styled from "styled-components"

enum GameState {
  START,
  PAUSE,
  GAME_OVER
}

type Piece = number[][]
type PieceType = "I" | "L" | "J" | "Z" | "S" | "O" | "T" | "R"
type Matrix = PieceType[][]

type CurrentPiece = {
  type: PieceType,
  position: [number, number]
  piece: Piece
}

interface State {
  gameState: GameState
  level: number
  line: number
  score: number
  controller: any
  bindController: any

  matrix: Matrix
  nextPieceType: PieceType
  holdPieceType: PieceType | null
  holdLocked: boolean
  currentPiece: CurrentPiece

  gameLoop: () => () => void
  viewMatrix: () => PieceType[][]
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

const generatePiece = (type: PieceType): Piece => {
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
        [1, 2, 1],
        [0, 1, 0],
      ]
    default:
      throw new Error(`invalid type ${type}`)
  }
}

const pieceTypes: PieceType[] = ["I", "L", "J", "Z", "S", "O", "T", "R"]
const generatePieceType = () => pieceTypes[Math.floor(Math.random() * (pieceTypes.length - 1))]
const createCurrentPiece = (type: PieceType): CurrentPiece => {
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

const moveDown = (currentPiece: CurrentPiece): CurrentPiece => {
  const [x, y] = currentPiece.position
  return {
    ...currentPiece,
    position: [x + 1, y]
  }
}

const moveLeft = (currentPiece: CurrentPiece): CurrentPiece => {
  const [x, y] = currentPiece.position
  return {
    ...currentPiece,
    position: [x, y - 1]
  }
}

const moveRight = (currentPiece: CurrentPiece): CurrentPiece => {
  const [x, y] = currentPiece.position
  return {
    ...currentPiece,
    position: [x, y + 1]
  }
}

const hardDrop = (currentPiece: CurrentPiece, matrix: Matrix): CurrentPiece => {
  const droppedPiece: CurrentPiece = {
    ...currentPiece,
    position: [...currentPiece.position]
  }
  while (isEmptyPosition(droppedPiece, matrix)) {
    droppedPiece.position[0] += 1
  }

  droppedPiece.position[0] -= 1

  return droppedPiece
}

const isEmptyPosition = (currentPiece: CurrentPiece, matrix: Matrix): boolean => {
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

const tryMove = (moveMethod: (c: CurrentPiece) => CurrentPiece): ((c: CurrentPiece, m: Matrix) => CurrentPiece) => {
  return (currentPiece, matrix) => {
    let movedPiece = moveMethod(currentPiece)

    if (movedPiece.position[0] < 0) {
      movedPiece.position[0] += 1
    }

    if (isEmptyPosition(movedPiece, matrix)) {
      return movedPiece
    } else {
      return currentPiece
    }
  }
}

// when transform, record the xy of pivot, and transformed xy of pivot, calculate to keep x1 == x2 + x, y1 == y2 + y
const rotate = ({ clockwise }: { clockwise: boolean}) => (currentPiece: CurrentPiece): CurrentPiece => {
  const { piece } = currentPiece
  const height = piece.length
  const width = piece[0].length
  const newPiece = Array(width).fill(null).map(() => Array(height).fill(0))
  let px = 0
  let py = 0

  for(let x = 0; x < height; x++) {
    for(let y = 0; y < width; y++) {
      if (!piece[x][y]) {
        continue
      }

      const [tx, ty] = clockwise ?
        [y, (height - 1 - x)] : 
        [width - 1 - y, x]

      newPiece[tx][ty] = piece[x][y]

      if (piece[x][y] === 2) {
        px = x - tx
        py = y - ty
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

const rotateRight = (currentPiece: CurrentPiece, matrix: Matrix) =>
  tryMove(rotate({ clockwise: true }))(currentPiece, matrix)

const rotateLeft = (currentPiece: CurrentPiece, matrix: Matrix) =>
  tryMove(rotate({ clockwise: false }))(currentPiece, matrix)

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
  currentPiece: createCurrentPiece(generatePieceType()),
  nextPieceType: generatePieceType(),
  holdPieceType: null,
  holdLocked: false
})

const lockPiece = (currentPiece: CurrentPiece, matrix: Matrix, nextPieceType: PieceType, line: number, score: number) => {
  const [lineCleared, newMatrix] = clearLines(addPieceTo(matrix, currentPiece))

  const newLine = line + lineCleared
  const level = Math.floor(newLine / LINES_EACH_LEVEL) + 1
  const nextPiece = createCurrentPiece(nextPieceType);

  return {
    currentPiece: nextPiece,
    matrix: newMatrix,
    line: newLine,
    holdLocked: false,
    nextPieceType: generatePieceType(),
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

        const movedPiece = tryMove(moveDown)(currentPiece, matrix)

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
    const reviewPiece = hardDrop(currentPiece, viewMatrix)
    reviewPiece.type = "R"

    return addPieceTo(addPieceTo(viewMatrix, reviewPiece), currentPiece)
  },
  controller: {
    ArrowUp: () => set(({ currentPiece, matrix }) => ({ currentPiece: rotateRight(currentPiece, matrix) })),
    ArrowLeft: () => set(state => ({ currentPiece: tryMove(moveLeft)(state.currentPiece, state.matrix) })),
    ArrowRight: () => set(state => ({ currentPiece: tryMove(moveRight)(state.currentPiece, state.matrix)})),
    ArrowDown: () => set(({ matrix, currentPiece, line, score, nextPieceType }) => {
      const movedPiece = tryMove(moveDown)(currentPiece, matrix)

      if (!isSamePosition(currentPiece, movedPiece)) {
        return {
          currentPiece: movedPiece
        }
      }

      return lockPiece(currentPiece, matrix, nextPieceType, line, score)
    }),
    KeyZ: () => {
      set(({ currentPiece, matrix}) => ({
        currentPiece: rotateLeft(currentPiece, matrix)
      }))
    },
    KeyX: () => {
      set(({ currentPiece, matrix}) => ({
        currentPiece: rotateRight(currentPiece, matrix)
      }))
    },
    KeyC: () => {
      set(({ currentPiece, holdPieceType, nextPieceType, holdLocked }) => {
        if (holdLocked) {
          return {}
        }

        if (!holdPieceType) {
          return {
            currentPiece: createCurrentPiece(nextPieceType),
            nextPieceType: generatePieceType(),
            holdPieceType: currentPiece.type,
            holdLocked: true
          }
        }

        return {
          currentPiece: createCurrentPiece(holdPieceType),
          holdPieceType: currentPiece.type,
          holdLocked: true
        }
      })
    },
    Space: () => {
      set(({ currentPiece, matrix, line, score, nextPieceType }) =>
        lockPiece(hardDrop(currentPiece, matrix), matrix, nextPieceType, line, score)
      )
    },
    Enter: () => {
      set(({ gameState }) => {
        if (gameState === GameState.GAME_OVER) {
          return initializeGame()
        } else if (gameState === GameState.START) {
          return { gameState: GameState.PAUSE }
        } else {
          return { gameState: GameState.START }
        }
      })
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

const BLOCK_COLORS: { [key: string]: string } = {
  I: "#54F0F0",
  S: "#57F000",
  L: "#F0A000",
  J: "#0100F0",
  T: "#A001F0",
  Z: "#F00B00",
  O: "#F0F000",
  R: "#DDDDDD"
}

const Block = styled.td<{type: string}>`
  border: ${({type}) => type === null ? "1px #142962 solid" : "1px solid black"};
  width: 20px;
  height: 20px;
  background-color: ${props => BLOCK_COLORS[props.type] || "#142962"}
`

const MatrixTable = styled.table`
  border-collapse: collapse;
`

const Board = ({matrix}: {matrix: string[][]}) => (
  <MatrixTable>
    {
    matrix.map((line, i) => (
      <tr key={`line-${i}`}>
        {
          line.map((type, j) => (
            <Block key={`block-${i}-${j}`} type={type} />
          ))
        }
      </tr>
    ))
    }
  </MatrixTable>
)

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
`

const Container = styled.div`
  display: flex;
`

const BoardContainer = styled.div`
  margin: 10px;
`

const PreviewBoard = styled.div`
  width: 100px;
  height: 100px;
  margin: 10px;
`

const Preview = ({ type }: { type: PieceType | null }) => {
  if (!type) {
    return null
  }

  return (
    <MatrixTable>
      {
        generatePiece(type).map((line, i) => (
          <tr>
            {
              line.map((p, j) => (
                <Block key={`preview-block-${i}-${j}`} type={p ? type : ""} />
              ))
            }
          </tr>
        ))
      }
    </MatrixTable>
  )
}

function App() {
  const {
    gameState,
    gameLoop,
    bindController,
    level,
    score,
    nextPieceType,
    holdPieceType,
    viewMatrix,
  } = useGame(state => state , shallow)

  useEffect(gameLoop, [gameLoop, gameState, level])
  useEffect(bindController)

  return (
    <Wrapper>
      <header>
        <h1>React Tetris</h1>
      </header>
      <Container>
        <BoardContainer>
          <Board matrix={viewMatrix()} />
        </BoardContainer>
        <div>
          <h5>next: </h5>
          <PreviewBoard>
            <Preview type={nextPieceType} />
          </PreviewBoard>
          <h5>hold: </h5>
          <PreviewBoard>
            <Preview type={holdPieceType} />
          </PreviewBoard>
          <h5>level: {level}</h5>
          <h5>score: {score}</h5>
        </div>
      </Container>
    </Wrapper>
  );
}

export default App;