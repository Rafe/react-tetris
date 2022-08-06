import React from "react";
import create from "zustand"
import shallow from "zustand/shallow"

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
  matrix: []
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

const useGame = create<GameState>(set => ({
  score: 0,
  line: 0,
  state: Status.START,
  matrix: [],
  pieceQueue: [],
  currentPiece: [],
  addScore(added: number) {
    set(state => ({ score: state.score + added }))
  }
}))

function App() {
  const { score, addScore } = useGame(state => ({ score: state.score, addScore: state.addScore }), shallow)
  return (
    <div className="App">
      <header className="App-header">React Tetris</header>
      <h2>{score}</h2>
      <button onClick={() => addScore(100)}>+100</button>
    </div>
  );
}

export default App;