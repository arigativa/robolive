import React from 'react'
import { css } from '@emotion/css'

import { Dispatch } from 'core'
import { ActionOf } from 'utils'

// S T A T E

// eslint-disable-next-line no-shadow
enum Mark {
  X = 'X',
  O = 'O'
}

class Board3x3 {
  public static readonly empty = new Board3x3({})

  private static readonly winnerLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ]

  private static hash(row: number, column: number): number {
    return row * 3 + column
  }

  private constructor(
    private readonly marks: Record<number, undefined | Mark>
  ) {}

  public getMovesCount(): number {
    return Object.keys(this.marks).length
  }

  public getCurrentMark(): Mark {
    // X always starts
    return this.getMovesCount() % 2 === 0 ? Mark.X : Mark.O
  }

  public putMarkAt(row: number, column: number): Board3x3 {
    return new Board3x3({
      ...this.marks,
      [Board3x3.hash(row, column)]: this.getCurrentMark()
    })
  }

  public getMarkAt(row: number, column: number): null | Mark {
    return this.marks[Board3x3.hash(row, column)] ?? null
  }

  public getWinner(): null | Mark {
    for (const [a, b, c] of Board3x3.winnerLines) {
      const winner = this.marks[a]

      if (
        winner != null &&
        winner === this.marks[b] &&
        winner === this.marks[c]
      ) {
        return winner
      }
    }

    return null
  }
}

class History<T> {
  public static init<A>(entity: A): History<A> {
    return new History([], entity, [])
  }

  private constructor(
    private readonly prev: Array<T>,
    public readonly current: T,
    private readonly next: Array<T>
  ) {}

  public get length(): number {
    return this.prev.length + 1 + this.next.length
  }

  public push(entity: T): History<T> {
    return new History([...this.prev, this.current], entity, [])
  }

  public go(index: number): History<T> {
    // out of range or already there
    if (index < 0 || index >= this.length || index === this.prev.length) {
      return this
    }

    // go back
    if (index < this.prev.length) {
      return new History(this.prev.slice(0, index), this.prev[index], [
        ...this.prev.slice(index + 1),
        this.current,
        ...this.next
      ])
    }

    // go forward

    const nextIndex = index - this.prev.length - 1

    return new History(
      [...this.prev, this.current, ...this.next.slice(0, nextIndex)],
      this.next[nextIndex],
      this.next.slice(nextIndex + 1)
    )
  }
}

export type State = History<Board3x3>

export const initial: State = History.init(Board3x3.empty)

// U P D A T E

export type Action = ActionOf<[State], State>

const PutCurrentPlayerMark = ActionOf<
  {
    row: number
    col: number
  },
  Action
>(({ row, col }, history) => {
  return history.push(history.current.putMarkAt(row, col))
})

const JumpTo = ActionOf<number, Action>((stepIndex, history) => {
  return history.go(stepIndex)
})

// V I E W

const cssSquare = css`
  background: #fff;
  border: 1px solid #999;
  float: left;
  font-size: 24px;
  font-weight: bold;
  line-height: 34px;
  height: 34px;
  margin-right: -1px;
  margin-top: -1px;
  padding: 0;
  text-align: center;
  width: 34px;

  &:focus {
    outline: none;
  }
`

const Square: React.FC<{
  mark: null | Mark
  onClick: VoidFunction
}> = ({ mark, onClick }) => (
  <button
    type="button"
    className={cssSquare}
    disabled={mark !== null}
    onClick={onClick}
  >
    {mark}
  </button>
)

const Board = React.memo<{
  board: Board3x3
  dispatch: Dispatch<Action>
}>(({ board, dispatch }) => {
  const hasWinner = board.getWinner() !== null

  return (
    <div>
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row}>
          {Array.from({ length: 3 }).map((__, col) => (
            <Square
              key={col}
              mark={board.getMarkAt(row, col)}
              onClick={() => {
                if (!hasWinner) {
                  dispatch(PutCurrentPlayerMark({ row, col }))
                }
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
})

const cssGameInfo = css`
  margin-left: 20px;
`

const cssGameLog = css`
  padding-left: 30px;
`

const GameInfo = React.memo<{
  board: Board3x3
  gameDuration: number
  dispatch: Dispatch<Action>
}>(({ board, gameDuration, dispatch }) => {
  const winner = board.getWinner()

  return (
    <div className={cssGameInfo}>
      <div>
        {winner === null
          ? `Next player: ${board.getCurrentMark()}`
          : `Winner is ${winner}`}
      </div>

      <ol className={cssGameLog}>
        {Array.from({ length: gameDuration }).map((_, index) => (
          <li key={index}>
            <button type="button" onClick={() => dispatch(JumpTo(index))}>
              {index === 0 ? 'Go to game start' : `Go to move #${index}`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
})

const cssGame = css`
  display: flex;
  flex-direction: row;
`

export const View = React.memo<{
  state: State
  dispatch: Dispatch<Action>
}>(({ state, dispatch }) => (
  <div className={cssGame}>
    <Board board={state.current} dispatch={dispatch} />

    <GameInfo
      board={state.current}
      gameDuration={state.length}
      dispatch={dispatch}
    />
  </div>
))
