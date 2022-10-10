# React Tetris

A React implementation for Tetris, using [Zustand](https://github.com/pmndrs/zustand) for state management.

# Application logic

```
A game has 7 types of Tetrimino: I, L, J, Z, S, O, T.
  show board that contains 20 * 10 Blocks.
  show the current moving piece that is controlled by player.
  show the future position when the current piece will drop
  show the next piece, the piece that is hold
  show the score, level and line

when game state is GAME_OVER or PAUSE
  press enter to start the game
when game state is START
  for every tick (0.8 - (level - 1) * 0.007) ** (level - 1) second
    the current piece move down

  when piece move down
    if the piece can move
      move current piece one block down
    if the piece is blocked
      add the tick to current tick time of the piece
      if tick time > 0.4 sec or total time > 4 sec
        add the current piece to board
        clear the line that is full
        add the line cleared to total lines
        add score by [40, 100, 300, 1200] for each line cleared
        add the level for every 20 lines cleared
        play the clear animation for 0.4 sec
        create new current piece from next piece
        create new next piece
  when piece move left
    if the piece can move
      move current piece one block left
      reset current piece tick time
  when piece move right
    if the piece can move
      move current piece one block right
      reset current piece tick time
  when piece hold
    if the hold piece exists
      switch the hold piece with current piece
      lock the piece hold until next current piece
    if the hold piece not exists
      put the current piece to hold
      create the new current piece
      create the new next piece
  when piece drop
    move the piece to the bottom of board
    play the shaken animation
    add the current piece to board
    clear the line that is full
    add the line cleared to total lines
    add score by [40, 100, 300, 1200] for each line cleared
    add the level for every 20 lines cleared
    play the clear animation for 0.4 sec
    create new current piece from next piece
    create new next piece
  when piece rotate
    move the current piece clockwise/counter clockwise by pivot
    if the piece is blocked
      try to move one block down
      or try to move one block right
      or try to move one block left
      or try to move two block up
      or cancel rotate
  when the current piece is blocked at the top
    save the game state to Game Over
```