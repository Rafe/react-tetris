import React, { useEffect } from "react";
import create from "zustand"
import shallow from "zustand/shallow"
import styled, { keyframes, css } from "styled-components"

enum GameState {
  START,
  PAUSE,
  GAME_OVER
}

type Piece = number[][]
type PieceType = "I" | "L" | "J" | "Z" | "S" | "O" | "T" | "R"
type Matrix = PieceType[][]

type CurrentPiece = {
  type: PieceType
  position: [number, number]
  piece: Piece
  tick: number
  totalTick: number
}

interface Controller {
  ArrowUp: () => void
  ArrowDown: (isHardDrop?: boolean) => void
  ArrowLeft: () => void
  ArrowRight: () => void
  KeyZ: () => void
  KeyX: () => void
  KeyC: () => void
  Space: () => void
  Enter: () => void
}

const EmptyController: Controller = {
  ArrowUp: () => null,
  ArrowDown: () => null,
  ArrowLeft: () => null,
  ArrowRight: () => null,
  KeyZ: () => null,
  KeyX: () => null,
  KeyC: () => null,
  Space: () => null,
  Enter: () => null,
}

interface State {
  gameState: GameState
  level: number
  line: number
  score: number
  controller: Controller
  bindKeyboardWithController: () => void

  matrix: Matrix
  nextPieceType: PieceType
  holdPieceType: PieceType | null
  linesToClear: boolean[]
  holdLocked: boolean
  shaken: boolean
  currentPiece: CurrentPiece | null

  gameLoop: () => () => void
  viewMatrix: () => Matrix
}

interface ButtonEvents {
  onTouchStart: () => void
  onTouchEnd: () => void
  onMouseDown: () => void
  onMouseUp: () => void
  onMouseOut: () => void
}

const LINES_EACH_LEVEL = 20
const BASE_SCORE_FOR_LINES = [0, 40, 100, 300, 1200]
const MATRIX_WIDTH = 10
const MATRIX_HEIGHT = 20

const generatePiece = (type: PieceType): Piece => {
  switch(type) {
    case "I":
      return [
        [1, 2, 1, 1]
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
    position: [-2, Math.floor((MATRIX_WIDTH - piece[0].length)/ 2)],
    piece,
    tick: 0,
    totalTick: 0
  }
}
const ENTRY_PIECE: CurrentPiece = {
  ...createCurrentPiece("O"),
  position: [-1, 4]
}

const getTickSeconds = (level: number): number => (0.8 - (level - 1) * 0.007) ** (level - 1)
const buildLine = (width = MATRIX_WIDTH): PieceType[] => new Array(width).fill(null)
const buildMatrix = (height = MATRIX_HEIGHT, width = MATRIX_WIDTH): Matrix => new Array(height).fill(null).map(() => buildLine(width))

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
    position: [x, y - 1],
    tick: 0
  }
}

const moveRight = (currentPiece: CurrentPiece): CurrentPiece => {
  const [x, y] = currentPiece.position
  return {
    ...currentPiece,
    position: [x, y + 1],
    tick: 0
  }
}

const moveUp = (currentPiece: CurrentPiece): CurrentPiece => {
  const [x, y] = currentPiece.position
  return {
    ...currentPiece,
    position: [x - 1, y],
    tick: 0
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

      if (px >= MATRIX_HEIGHT) {
        return false
      } else if (py < 0 || py >= MATRIX_WIDTH) {
        return false
      } else if (matrix[px] && matrix[px][py]) {
        return false
      }
    }
  }

  return true
}

const tryMove = (moveMethod: (c: CurrentPiece) => CurrentPiece): ((c: CurrentPiece | null, m: Matrix) => CurrentPiece | null) => {
  return (currentPiece, matrix) => {
    if (!currentPiece) {
      return currentPiece;
    }

    const movedPiece = moveMethod(currentPiece)

    if (isEmptyPosition(movedPiece, matrix)) {
      return movedPiece
    } else {
      return currentPiece
    }
  }
}

const tryWallKick = (moveMethod: (c: CurrentPiece) => CurrentPiece): ((c: CurrentPiece | null, m: Matrix) => CurrentPiece | null) => {
  return (currentPiece, matrix) => {
    if (!currentPiece) {
      return currentPiece;
    }

    const movedPiece = moveMethod(currentPiece)

    if (isEmptyPosition(movedPiece, matrix)) {
      return movedPiece
    } 

    if (isEmptyPosition(moveDown(movedPiece), matrix)) {
      return moveDown(movedPiece)
    }

    if (isEmptyPosition(moveLeft(movedPiece), matrix)) {
      return moveLeft(movedPiece)
    }

    if (isEmptyPosition(moveRight(movedPiece), matrix)) {
      return moveRight(movedPiece)
    }

    if (isEmptyPosition(moveUp(moveUp(movedPiece)), matrix)) {
      return moveUp(moveUp(movedPiece))
    }

    return currentPiece
  }
}

// when transform, record the xy of pivot (value === 2),
// and transformed along xy to keep x1 == x2 + x, y1 == y2 + y
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
    piece: newPiece,
    tick: 0
  }
}

const rotateRight = (currentPiece: CurrentPiece | null, matrix: Matrix) =>
  tryWallKick(rotate({ clockwise: true }))(currentPiece, matrix)

const rotateLeft = (currentPiece: CurrentPiece | null, matrix: Matrix) =>
  tryWallKick(rotate({ clockwise: false }))(currentPiece, matrix)

const addPieceTo = (matrix: Matrix, currentPiece: CurrentPiece): Matrix => {
  const [x, y] = currentPiece.position
  for (let i = 0; i < currentPiece.piece.length; i++) {
    for (let j = 0; j < currentPiece.piece[i].length; j++) {
      const px = x + i
      const py = y + j
      if (px >= 0 && px < matrix.length && py >= 0 && py < matrix[0].length && currentPiece.piece[i][j]) {
        matrix[px][py] = currentPiece.type
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

const findLinesToClear = (matrix: Matrix): boolean[] => (
  matrix.reduce((result, line, i) => {
    if (line.every((block) => block)) {
      result[i] = true
    }

    return result
  }, new Array(matrix.length).fill(false))
)

const clearLines = (matrix: Matrix): [boolean[], Matrix] => {
  const linesToClear = findLinesToClear(matrix)

  const newMatrix = matrix.reduce<Matrix>((result, line, i) => {
    if (linesToClear[i]) {
      result.unshift(buildLine())
    } else {
      result.push(line)
    }

    return result
  }, [])

  return [linesToClear, newMatrix]
}

const repeatingEvents: { [key: string]: any[] } = { ArrowLeft: [], ArrowRight: [], ArrowDown: [] }

const pressButton = (eventCode: string, controller: Controller, isLoop = false) => {
  if (!controller[eventCode as keyof Controller]) {
    return
  }

  if (repeatingEvents[eventCode]?.length && !isLoop) {
    return
  }

  controller[eventCode as keyof Controller]()

  if(repeatingEvents[eventCode]) {
    repeatingEvents[eventCode].push(setTimeout(() => {
      pressButton(eventCode, controller, true);
    }, isLoop ? 50 : 150))
  }
}

const releaseButton = (eventCode: string) => {
  while (repeatingEvents[eventCode]?.length) {
    const ref = repeatingEvents[eventCode].pop()
    clearTimeout(ref)
  }
}

const touchStartEvents: { [key: string]: boolean } = {}
const mouseDownEvents: { [key: string]: boolean } = {}
const handleButtonEvents = (eventCode: string, controller: Controller): ButtonEvents => {
  const onTouchStart = () => {
    touchStartEvents[eventCode] = true
    pressButton(eventCode, controller)
  }
  const onTouchEnd = () => {
    releaseButton(eventCode)
  }
  const onMouseDown = () => {
    if (touchStartEvents[eventCode]) {
      return
    }

    mouseDownEvents[eventCode] = true
    pressButton(eventCode, controller)
  }
  const onMouseUp = () => {
    if (touchStartEvents[eventCode]) {
      touchStartEvents[eventCode] = false
      return
    }
    releaseButton(eventCode)
    mouseDownEvents[eventCode] = false
  }
  const onMouseOut = () => {
    if (mouseDownEvents[eventCode]) {
      releaseButton(eventCode)
    }
  }

  return {
    onTouchStart,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
    onMouseOut
  }
}

const initializeGame = () => ({
  gameState: GameState.START,
  level: 1,
  line: 0,
  score: 0,

  matrix: buildMatrix(),
  currentPiece: createCurrentPiece(generatePieceType()),
  nextPieceType: generatePieceType(),
  linesToClear: new Array(MATRIX_WIDTH).fill(false),
  holdPieceType: null,
  holdLocked: false,
  shaken: false
})

const useGame = create<State>((set, get) => ({
  ...initializeGame(),
  gameLoop() {
    const ref = setInterval(() => {
      if (get().gameState !== GameState.START) {
        return
      }

      get().controller.ArrowDown()
    }, 1000 * getTickSeconds(get().level))

    return () => {
      clearInterval(ref)
    }
  },
  viewMatrix() {
    const { matrix, currentPiece, gameState } = get()

    if (!currentPiece) {
      return matrix;
    }

    const viewMatrix = matrix.map(row => [...row])

    if (gameState === GameState.GAME_OVER) {
      return addPieceTo(viewMatrix, currentPiece)
    }

    const reviewPiece = hardDrop(currentPiece, matrix)
    reviewPiece.type = "R"

    return addPieceTo(addPieceTo(viewMatrix, reviewPiece), currentPiece)
  },
  controller: {
    ArrowUp: () => set(({ currentPiece, matrix }) => ({ currentPiece: rotateRight(currentPiece, matrix) })),
    ArrowLeft: () => set(state => ({ currentPiece: tryMove(moveLeft)(state.currentPiece, state.matrix) })),
    ArrowRight: () => set(state => ({ currentPiece: tryMove(moveRight)(state.currentPiece, state.matrix)})),
    ArrowDown: (isHardDrop = false) => set(({ matrix, currentPiece, line, level, score, nextPieceType }) => {
      if (!currentPiece) {
        return {}
      }

      const movedPiece = isHardDrop ? hardDrop(currentPiece, matrix) : tryMove(moveDown)(currentPiece, matrix)

      if (!movedPiece) {
        return {}
      }

      if (!isHardDrop && !isSamePosition(currentPiece, movedPiece)) {
        return {
          currentPiece: movedPiece,
        }
      }

      if (!isHardDrop && currentPiece.tick < 0.4 && currentPiece.totalTick < 4) {
        const tickSeconds = getTickSeconds(level)
        return {
          currentPiece: {
            ...movedPiece,
            tick: movedPiece.tick + tickSeconds,
            totalTick: movedPiece.totalTick + tickSeconds
          }
        }
      }

      const animation: { shaken: boolean } = { shaken: false }
      if (isHardDrop) {
        animation["shaken"] = true
        setTimeout(() => {
          set(() => ({
            shaken: false
          }))
        }, 100)
      }

      const [linesToClear, newMatrix] = clearLines(addPieceTo(matrix, movedPiece))
      const lineCleared = linesToClear.filter(l => l).length
      const nextPiece = createCurrentPiece(nextPieceType);
      const newGameState = isEmptyPosition(ENTRY_PIECE, newMatrix) ? GameState.START : GameState.GAME_OVER

      if (lineCleared === 0) {
        return {
          holdLocked: false,
          currentPiece: nextPiece,
          nextPieceType: generatePieceType(),
          matrix,
          gameState: newGameState,
          ...animation
        }
      }

      const newLine = line + lineCleared
      const newLevel = Math.floor(newLine / LINES_EACH_LEVEL) + 1

      setTimeout(() => {
        set(() => ({
          holdLocked: false,
          currentPiece: nextPiece,
          nextPieceType: generatePieceType(),
          matrix: newMatrix,
          gameState: newGameState,
          linesToClear: new Array(MATRIX_WIDTH).fill(false),
        }))
      }, 400)

      return {
        currentPiece: null,
        linesToClear,
        line: newLine,
        level: newLevel,
        score: score + (newLevel * BASE_SCORE_FOR_LINES[lineCleared]) ,
        ...animation
      }
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
        if (holdLocked || !currentPiece) {
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
      get().controller.ArrowDown(true)
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
  bindKeyboardWithController() {
    const { controller, gameState } = get();

    const eventListener = (event: KeyboardEvent) => {
      if ([GameState.GAME_OVER, GameState.PAUSE].includes(gameState) && event.code !== "Enter") {
        return
      }

      pressButton(event.code, controller)
    }

    const eventRemover = (event: KeyboardEvent) => {
      releaseButton(event.code)
    }

    document.addEventListener("keydown", eventListener)
    document.addEventListener("keyup", eventRemover)
    return () => {
      document.removeEventListener("keydown", eventListener)
      document.removeEventListener("keyup", eventRemover)
    }
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
  R: "#142962"
}

const clearAnimation = keyframes`
  60% { background-color: #FFFFFF }
  100% { background-color: #142962 }
`
const Block = styled.td<{type: string, clear?: boolean}>`
  border: ${({type}) => {
    if (type === "R") {
      return "1px double white"
    } else if (type) {
      return "1px solid black"
    } else {
      return "1px solid #142962"
    }
  }};
  margin: 0;
  padding: 0;
  width: 20px;
  height: 20px;
  background-color: ${props => BLOCK_COLORS[props.type] || "#142962"};
  ${({clear}) => clear && css`
    animation-name: ${clearAnimation};
    animation-duration: 0.4s;
  `}
`

const EmptyBlock = styled.td`
  margin: 0;
  padding: 0;
  width: 20px;
  height: 20px;
  border: 0px;
`

const MatrixTable = styled.table<{shaken?: boolean}>`
  border-collapse: collapse;
  transform: ${({shaken}) => shaken ? "translateY(5px)" : "none"};
`

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  align-items: center;
`

const ContainerWrapper = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
`

const Container = styled.div`
  display: flex;
  flex: 1;
`

const Description = styled.div`
  width: 100%;
  background-color: #EEE;
  text-align: center;
  padding-top: 15px;

  @media only screen and (max-width: 820px) {
    display: none;
  }
`

const SideContainer = styled.div`
`

const BoardContainer = styled.div`
  margin: 10px;
  position: relative;
`

const PreviewBoard = styled.div`
  width: 85px;
  height: 60px;
  margin: 5px 0;
`

const GameStateOverlay = styled.div`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  left: 0;
  top: 0; 
  background-color: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 100%;
`

const GameStateContainer = styled.div`
  color: #FFF;
  text-align: center;
`

const ControllerPad = styled.div`
  display: flex;
  position: relative;
  padding: 15px 15px 50px;
`

const HowTo = styled.div`
  position: absolute;
  left: -350px;
  top: -50px;
  padding: 25px;
  background-color: #EEE;
  border-radius: 25px;

  @media only screen and (max-width: 820px) {
    display: none;
  }
`

const LeftPad = styled.div`
  display: flex;
  flex-direction: column;
`

const CenterPad = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px 0;
`

const RightPad = styled.div`
  display: flex;
  flex-direction: column;
`

const CenterRow = styled.div`
  width: 165px;
  display: flex;
  justify-content: center;
`

const MiddleRow = styled.div`
  display: flex;
  justify-content: space-between;
`

const Button = styled.button.attrs(() => ({ tabIndex: -1 }))`
  background-color: #5a64f1;
  border: 1px solid #000;
  border-radius: 50%;
  box-shadow: 0 3px 3px rgba(0, 0, 0, 0.2);
  color: white;
  width: 70px;
  height: 70px;
  text-aligh: center;
  font-size: 12px;
`

const StartButton = styled.button.attrs(() => ({ tabIndex: -1 }))`
  background-color: #DDD;
  border: 1px solid #000;
  border-radius: 5px;
  box-shadow: 0 3px 3px rgba(0, 0, 0, 0.2);
  padding: 0;
  width: 40px;
  height: 20px;
  text-aligh: center;
  font-size: 10px;
`

const Arrow = styled.div<{degree?: number}>`
  width: 0; 
  height: 0; 
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  display: inline-block;
  
  border-bottom: 15px solid white;
  rotate: ${(props) => props.degree || 0}deg
`

const Preview = ({ type }: { type: PieceType | null }) => {
  if (!type) {
    return null
  }

  return (
    <MatrixTable>
      <tbody>
        {
          generatePiece(type).map((line, i) => (
            <tr key={`preview-row-${i}`}>
              {
                line.map((p, j) => (
                  p ?
                    <Block key={`preview-block-${i}-${j}`} type={type} /> :
                    <EmptyBlock key={`preview-block-${i}-${j}`} />
                ))
              }
            </tr>
          ))
        }
      </tbody>
    </MatrixTable>
  )
}

function App() {
  const {
    bindKeyboardWithController,
    controller,
    linesToClear,
    gameLoop,
    gameState,
    holdPieceType,
    level,
    line,
    nextPieceType,
    score,
    viewMatrix,
    shaken
  } = useGame(state => state , shallow)

  useEffect(gameLoop, [gameLoop, level])
  useEffect(bindKeyboardWithController)

  const controllerPad: Controller = gameState === GameState.START ?
    controller :
    { ...EmptyController, Enter: controller.Enter }

  return (
    <Wrapper>
      <Description>
        <h3>React-Tetris</h3>
        <iframe src="https://ghbtns.com/github-btn.html?user=rafe&repo=react-tetris&type=star&count=true&size=large" frameBorder="0" scrolling="0" width="170" height="30" title="GitHub"></iframe>
        <iframe src="https://ghbtns.com/github-btn.html?user=rafe&repo=react-tetris&type=fork&count=true&size=large" frameBorder="0" scrolling="0" width="170" height="30" title="GitHub"></iframe>
      </Description>
      <ContainerWrapper>
        <Container>
          <SideContainer>
            <p>HOLD</p>
            <PreviewBoard>
              <Preview type={holdPieceType} />
            </PreviewBoard>
          </SideContainer>
          <BoardContainer>
            {gameState === GameState.GAME_OVER && (
              <GameStateOverlay>
                <GameStateContainer>
                  <h1>Game Over</h1>
                  <p>Press "Enter" to restart</p>
                </GameStateContainer>
              </GameStateOverlay>
            )}
            {gameState === GameState.PAUSE && (
              <GameStateOverlay>
                <GameStateContainer>
                  <h1>Paused</h1>
                  <p>Press "Enter" to continue</p>
                </GameStateContainer>
              </GameStateOverlay>
            )}
            <MatrixTable shaken={shaken}>
              <tbody>
                {
                  viewMatrix().map((line, i) => (
                    <tr key={`line-${i}`}>
                      {
                        line.map((type, j) => (
                          <Block key={`block-${i}-${j}`} type={type} clear={linesToClear[i]} />
                        ))
                      }
                    </tr>
                  ))
                }
              </tbody>
            </MatrixTable>
          </BoardContainer>
          <SideContainer>
            <p>NEXT</p>
            <PreviewBoard>
              <Preview type={nextPieceType} />
            </PreviewBoard>
            <p>Level: {level}</p>
            <p>Score: {score}</p>
            <p>Line: {line}</p>
          </SideContainer>
        </Container>
      </ContainerWrapper>
      <ControllerPad>
        <HowTo>
          <h5>Keyboard Control</h5>
          <ul>
            <li>Arrow key to control direction</li>
            <li>Z: Rotate left</li>
            <li>X: Rotate right</li>
            <li>C: Hold</li>
            <li>Space: Drop</li>
            <li>Enter: Start/Pause</li>
          </ul>
        </HowTo>
        <LeftPad>
          <CenterRow>
            <Button onClick={controllerPad.ArrowUp}>
              <Arrow />
            </Button>
          </CenterRow>
          <MiddleRow>
            <Button {...handleButtonEvents("ArrowLeft", controllerPad)}>
              <Arrow degree={270} />
            </Button>
            <Button {...handleButtonEvents("ArrowRight", controllerPad)}>
              <Arrow degree={90} />
            </Button>
          </MiddleRow>
          <CenterRow>
            <Button {...handleButtonEvents("ArrowDown", controllerPad)}>
              <Arrow degree={180} />
            </Button>
          </CenterRow>
        </LeftPad>
        <CenterPad>
          <StartButton onClick={controllerPad.Enter}>Enter</StartButton>
        </CenterPad>
        <RightPad>
          <CenterRow>
            <Button onClick={controllerPad.Space}>Drop</Button>
          </CenterRow>
          <MiddleRow>
            <Button onClick={controllerPad.KeyZ}>L</Button>
            <Button onClick={controllerPad.KeyC}>Hold</Button>
          </MiddleRow>
          <CenterRow>
            <Button onClick={controllerPad.KeyX}>R</Button>
          </CenterRow>
        </RightPad>
      </ControllerPad>
    </Wrapper>
  );
}

export default App;