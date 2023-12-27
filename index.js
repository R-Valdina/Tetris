const stage = document.getElementById('stage')
const ctxMain = stage.getContext('2d')

const GRID_WIDTH = 10
const GRID_HEIGHT = 20
const SQUARE_SIZE = 30

const STAGE_NEXT_PIECE_SIZE = 150

const scoreParagraph = document.getElementById('score')
const levelParagraph = document.getElementById('level')

const pauseBtn = document.getElementById('pauseBtn')

const nextPieceStage = document.getElementById('nextPieceStage')
const ctxNextPiece = nextPieceStage.getContext('2d')
nextPieceStage.setAttribute('width', STAGE_NEXT_PIECE_SIZE)
nextPieceStage.setAttribute('height', STAGE_NEXT_PIECE_SIZE)
ctxNextPiece.fillStyle = '#FFFFFF'
ctxNextPiece.fillRect(0, 0, STAGE_NEXT_PIECE_SIZE, STAGE_NEXT_PIECE_SIZE)

let score = 0

const DELAY = 500
const DELAY_DECREASED = 20

let level = 1

let gameOver = false
let interval
let pause = false

let board = Array(GRID_HEIGHT * GRID_WIDTH).fill(undefined)

let currX = 4
let currY = 1

const COLOR_BACKGROUND = '#171616'
stage.setAttribute('width', GRID_WIDTH * SQUARE_SIZE)
stage.setAttribute('height', GRID_HEIGHT * SQUARE_SIZE)

// Shape - Tetromino

const rotationMatrixRight = [[0, 1], [-1, 0]]
const rotationMatrixLeft = [[0, -1], [1, 0]]

const multiplyMatrices = (M1, M2) => {
  const result = []
  for (let i = 0; i < M1.length; i++) {
    result[i] = []
    for (let j = 0; j < M2[0].length; j++) {
      let sum = 0
      for (let k = 0; k < M1[0].length; k++) {
        sum += M1[i][k] * M2[k][j]
      }
      result[i][j] = sum
    }
  }
  return result
}

class Shape {
  constructor({ coordinates, color, name }) {
    this.coordinates = coordinates
    this.color = color
    this.name = name
  }

  getX(index) {
    return this.coordinates[index][0]
  }

  getY(index) {
    return this.coordinates[index][1]
  }

  rotateLeft() {
    if (this == SQUARE_SHAPE) {
      return this
    }

    const result = multiplyMatrices(this.coordinates, rotationMatrixLeft)
    return new Shape({ coordinates: result, color: this.color, name: this.name })
  }

  rotateRight() {
    if (this == SQUARE_SHAPE) {
      return this
    }

    const result = multiplyMatrices(this.coordinates, rotationMatrixRight)
    return new Shape({ coordinates: result, color: this.color, name: this.name })
  }
}

const Z_SHAPE_COORDINATES = [[0, -1], [0, 0], [-1, 0], [-1, 1]]
const S_SHAPE_COORDINATES = [[0, -1], [0, 0], [1, 0], [1, 1]]
const LINE_SHAPE_COORDINATES = [[0, -1], [0, 0], [0, 1], [0, 2]]
const T_SHAPE_COORDINATES = [[-1, 0], [0, 0], [1, 0], [0, 1]]
const SQUARE_SHAPE_COORDINATES = [[0, 0], [1, 0], [0, 1], [1, 1]]
const L_SHAPE_COORDINATES = [[-1, -1], [0, -1], [0, 0], [0, 1]]
const MIRRORED_SHAPE_COORDINATES = [[1, -1], [0, -1], [0, 0], [0, 1]]

const Z_SHAPE = new Shape({ coordinates: Z_SHAPE_COORDINATES, color: '#e01212', name: "Z_SHAPE" })
const S_SHAPE = new Shape({ coordinates: S_SHAPE_COORDINATES, color: "#0de00d", name: "S_SHAPE" })
const LINE_SHAPE = new Shape({ coordinates: LINE_SHAPE_COORDINATES, color: "#0707ed", name: "LINE_SHAPE" })
const T_SHAPE = new Shape({ coordinates: T_SHAPE_COORDINATES, color: "#e8e807", name: "T_SHAPE" })
const SQUARE_SHAPE = new Shape({ coordinates: SQUARE_SHAPE_COORDINATES, color: "#ed05ed", name: "SQUARE_SHAPE" })
const L_SHAPE = new Shape({ coordinates: L_SHAPE_COORDINATES, color: "#05e6e6", name: "L_SHAPE" })
const MIRRORED_L_SHAPE = new Shape({ coordinates: MIRRORED_SHAPE_COORDINATES, color: "#da5b00", name: "MIRRORED_L_SHAPE" })

const shapes = [Z_SHAPE, S_SHAPE, LINE_SHAPE, T_SHAPE, SQUARE_SHAPE, L_SHAPE, MIRRORED_L_SHAPE]

let currentShape = shapes[Math.floor(Math.random() * 7)]
let nextShape = shapes[Math.floor(Math.random() * 7)]

const shapeAt = (x, y) => {
  return board[y * GRID_WIDTH + x]
}

const colorShade = (col, amt) => {
  col = col.replace(/^#/, '')
  if (col.length === 3) {
    col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2]
  }

  let [r, g, b] = col.match(/.{2}/g);
  ([r, g, b] = [parseInt(r, 16) + amt, parseInt(g, 16) + amt, parseInt(b, 16) + amt])

  r = Math.max(Math.min(255, r), 0).toString(16)
  g = Math.max(Math.min(255, g), 0).toString(16)
  b = Math.max(Math.min(255, b), 0).toString(16)

  const rr = (r.length < 2 ? '0' : '') + r
  const gg = (g.length < 2 ? '0' : '') + g
  const bb = (b.length < 2 ? '0' : '') + b

  return `#${rr}${gg}${bb}`
}

const drawLine = (x1, y1, x2, y2, color, context) => {
  context.strokeStyle = color
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.stroke()
}

const drawSquare = (x, y, color, context) => {
  context.fillStyle = color
  context.fillRect(x + 1, y + 1, SQUARE_SIZE - 2, SQUARE_SIZE - 2)

  const colorLighter = colorShade(color, -30)
  const colorDarker = colorShade(color, 30)

  drawLine(x, y + SQUARE_SIZE - 1, x, y, colorLighter, context)
  drawLine(x, y, x + SQUARE_SIZE - 1, y, colorLighter, context)
  drawLine(x + 1, y + SQUARE_SIZE - 1, x + SQUARE_SIZE - 1, y + SQUARE_SIZE - 1, colorDarker, context)
  drawLine(x + SQUARE_SIZE - 1, y + SQUARE_SIZE - 1, x + SQUARE_SIZE - 1, y + 1, colorDarker, context)
}

const drawPiece = (shape, currentX, currentY, context) => {
  for (let i = 0; i < shape.coordinates.length; i++) {
    const x = (shape.coordinates[i][0] + currentX) * SQUARE_SIZE
    const y = (shape.coordinates[i][1] + currentY) * SQUARE_SIZE

    drawSquare(x, y, shape.color, context)
  }
}

const canMove = (newX, newY, shape) => {
  for (let i = 0; i < 4; i++) {
    const x = newX + shape.getX(i)
    const y = newY + shape.getY(i)

    // boundaries
    if (x < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
      return false
    }

    // collision
    if (shapeAt(x, y)) {
      return false
    }
  }

  currX = newX
  currY = newY

  currentShape = shape

  renderOnStage()
  return true
}

const renderOnStage = () => {
  // repaint background
  ctxMain.fillStyle = COLOR_BACKGROUND
  ctxMain.fillRect(0, 0, stage.width, stage.height)

  drawPiece(currentShape, currX, currY, ctxMain)

  // draw Board
  for (let i = 0; i < GRID_HEIGHT; i++) {
    for (let j = 0; j < GRID_WIDTH; j++) {
      if (board[i * GRID_WIDTH + j]) {
        drawSquare(j * SQUARE_SIZE, i * SQUARE_SIZE, board[i * GRID_WIDTH + j].color, ctxMain)
      }
    }
  }
}

window.addEventListener('keydown', event => {
  if (event.key === 'a') {
    canMove(currX - 1, currY, currentShape)
  } else if (event.key === 'd') {
    canMove(currX + 1, currY, currentShape)
  } else if (event.key === 'e') {
    canMove(currX, currY, currentShape.rotateRight())
  } else if (event.key === 'q') {
    canMove(currX, currY, currentShape.rotateLeft())
  } else if (event.key === 's') {
    canMove(currX, currY + 1, currentShape)
  } else if (event.code === 'Space') {
    dropDown()
  }
})

const dropDown = () => {
  let newY = currY

  while (newY > 0) {
    if (!canMove(currX, newY + 1, currentShape)) {
      break
    }
    newY++
  }
}

const startGame = () => {
  interval = setInterval(gameLoop, DELAY - (level - 1) * DELAY_DECREASED)
}

const gameLoop = () => {
  if (!pause) {
    clearInterval(interval)
    if (!gameOver) {
      oneLineDown()
      renderNextPiece()
    } else {
      ctxMain.fillStyle = 'white'
      ctxMain.font = '15px Trebuchet MS'
      ctxMain.fillText('Game Over', stage.width / 2 - 30, stage.height / 2)
      ctxMain.fillText('Press New Game to Restart ;)', stage.width / 2 - 80, stage.height / 2 + 20)
    }
    interval = setInterval(gameLoop, DELAY - (level - 1) * DELAY_DECREASED)
  }
}

const oneLineDown = () => {
  if (!canMove(currX, currY + 1, currentShape)) {
    savePieceOnBoard()
  }
}

window.onload = function () {
  startGame()
}

const savePieceOnBoard = () => {
  currentShape.coordinates.forEach(el => {
    board[(currY + el[1]) * GRID_WIDTH + currX + el[0]] = { filled: true, color: structuredClone(currentShape.color) }
  });

  checkLinesToRemove()

  generateNewShape()
}

const checkLinesToRemove = () => {
  let numFullLines = 0

  for (let i = 0; i < GRID_HEIGHT; i++) {

    let lineIsFull = true

    for (let j = 0; j < GRID_WIDTH; j++) {
      if (shapeAt(j, i) == undefined) {
        lineIsFull = false
        break
      }

    }

    if (lineIsFull) {
      numFullLines++
      for (let k = i; k > 0; k--) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          board[k * GRID_WIDTH + x] = shapeAt(x, k - 1)
        }
      }
    }
  }

  score += numFullLines
  scoreParagraph.innerText = score

  level = Math.floor(score / 10) + 1
  levelParagraph.innerText = level
}

const generateNewShape = () => {
  if (currY - 1 <= 0) {
    gameOver = true
  }

  currX = 4
  currY = 1

  currentShape = nextShape
  nextShape = shapes[Math.floor(Math.random() * 7)]

  renderOnStage()
}

const paddingNextShape = {
  Z_SHAPE: {
    x: 1.25,
    y: 1
  },
  S_SHAPE: {
    x: 1.75,
    y: 1
  },
  LINE_SHAPE: {
    x: 3,
    y: .875
  },
  T_SHAPE: {
    x: 1,
    y: 1.75
  },
  SQUARE_SHAPE: {
    x: 1.75,
    y: 1.75
  },
  L_SHAPE: {
    x: 1.25,
    y: 1
  },
  MIRRORED_L_SHAPE: {
    x: 1.75,
    y: 1
  }
}

const renderNextPiece = () => {
  // repaint background
  ctxNextPiece.fillStyle = '#FFFFFF'
  ctxNextPiece.fillRect(0, 0, STAGE_NEXT_PIECE_SIZE, STAGE_NEXT_PIECE_SIZE)

  const widthShape = Math.abs(Math.max(...nextShape.coordinates.map(el => el[0])) - Math.min(...nextShape.coordinates.map(el => el[0]))) + 1
  const heightShape = Math.abs(Math.max(...nextShape.coordinates.map(el => el[1])) - Math.min(...nextShape.coordinates.map(el => el[1]))) + 1

  const { x: xPadding, y: yPadding } = paddingNextShape[nextShape.name]

  drawPiece(nextShape, 5 - xPadding * widthShape, 5 - yPadding * heightShape, ctxNextPiece)
}

const switchPause = () => {
  pause = !pause
  if (pause) {
    pauseBtn.innerText = 'Continue'
  } else {
    pauseBtn.innerText = 'Pause'
  }
}

const newGame = () => {
  score = 0

  currX = 4
  currY = 1

  gameOver = false
  pause = false

  board = Array(GRID_HEIGHT * GRID_WIDTH).fill(undefined)
  currentShape = shapes[Math.floor(Math.random() * 7)]
  nextShape = shapes[Math.floor(Math.random() * 7)]
}