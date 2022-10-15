# React Tetris

A React implementation for Tetris, using [Zustand](https://github.com/pmndrs/zustand) for state management.

# Application logic

```
A game has 7 types of Tetrimino: I, L, J, Z, S, O, T.
  show board that contains 20 * 10 Blocks.
  show the current moving piece that is controlled by the player.
  show the future position where the current piece will drop
  show the next piece, and the piece that is held
  show the score, level, and line

when the game state is GAME_OVER or PAUSE
  press enter to start the game
when the game state is START
  for every tick (0.8 - (level - 1) * 0.007) ** (level - 1) second
    the current piece moves down

  when the piece move down
    if the piece can move
      move the current piece one block down
    if the piece is blocked
      add the tick to the current tick time of the piece
      if tick time > 0.4 sec or total time > 4 sec
        add the current piece to the board
        clear the full line
        add the line cleared to the total lines
        add score by [40, 100, 300, 1200] for each line cleared
        add the level for every 20 lines cleared
        play the clear animation for 0.4 sec
        create a new current piece from the next piece
        create a new next piece
  when the piece move left
    if the piece can move
      move the current piece one block left
      reset current piece tick time
  when the piece move right
    if the piece can move
      move the current piece one block right
      reset current piece tick time
  when piece hold
    if the holding piece exists
      switch the holding piece with the current piece
      lock the piece and hold until the next current piece
    if the holding piece not exists
      put the current piece to hold
      create the new current piece
      create the new next piece
  when piece drop
    move the piece to the bottom of the board
    play the shaken animation
    add the current piece to the board
    clear the full line
    add the line cleared to the total lines
    add score by [40, 100, 300, 1200] for each line cleared
    add the level for every 20 lines cleared
    play the clear animation for 0.4 sec
    create a new current piece from the next piece
    create a new next piece
  when piece rotate
    move the current piece clockwise/counterclockwise by pivot
    if the piece is blocked
      try to move one block down
      or try to move one block right
      or try to move one block left
      or try to move two blocks up
      or cancel rotate
  when the current piece is blocked at the top
    save the game state to Game Over
  when the arrow key ArrowLeft, ArrowDown, ArrowRight is pressed
    overwrite original input
    when the key pressed repeat the key after 0.15s in 0.05s interval
    when the key released, stop the repeat key
```