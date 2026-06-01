import * as THREE from "three"
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"
import { camera, renderer } from "./main.js"
import { hasKeyForRoom, getDoorState } from "./gameState.js"

const MOVE_SPEED = 0.08
const EYE_LEVEL = 1.6
const MIN_X = -4
const MAX_X = 4
const MIN_Z = -52
const MAX_Z = 3
const ROOM_COUNT = 5
const ROOM_WIDTH = 10
const ROOM_DEPTH = 10
const ROOM_SPACING = 12
const WALL_THICKNESS = 0.2
const DOORWAY_WIDTH = 2
const DOOR_PANEL_THICKNESS = 0.14

const HALF_ROOM_WIDTH = ROOM_WIDTH / 2
const HALF_ROOM_DEPTH = ROOM_DEPTH / 2
const HALF_WALL_THICKNESS = WALL_THICKNESS / 2
const HALF_DOORWAY_WIDTH = DOORWAY_WIDTH / 2
const HALF_DOOR_PANEL_THICKNESS = DOOR_PANEL_THICKNESS / 2

const roomCentersZ = Array.from({ length: ROOM_COUNT }, (_, index) => index * -ROOM_SPACING)

function createZWallSegments(z) {
  return [
    {
      minX: -HALF_ROOM_WIDTH - HALF_WALL_THICKNESS,
      maxX: -HALF_DOORWAY_WIDTH,
      minZ: z - HALF_WALL_THICKNESS,
      maxZ: z + HALF_WALL_THICKNESS,
    },
    {
      minX: HALF_DOORWAY_WIDTH,
      maxX: HALF_ROOM_WIDTH + HALF_WALL_THICKNESS,
      minZ: z - HALF_WALL_THICKNESS,
      maxZ: z + HALF_WALL_THICKNESS,
    },
  ]
}

const roomWallColliders = roomCentersZ.flatMap((roomZ) => [
  {
    minX: -HALF_ROOM_WIDTH - HALF_WALL_THICKNESS,
    maxX: -HALF_ROOM_WIDTH + HALF_WALL_THICKNESS,
    minZ: roomZ - HALF_ROOM_DEPTH,
    maxZ: roomZ + HALF_ROOM_DEPTH,
  },
  {
    minX: HALF_ROOM_WIDTH - HALF_WALL_THICKNESS,
    maxX: HALF_ROOM_WIDTH + HALF_WALL_THICKNESS,
    minZ: roomZ - HALF_ROOM_DEPTH,
    maxZ: roomZ + HALF_ROOM_DEPTH,
  },
  ...createZWallSegments(roomZ + HALF_ROOM_DEPTH),
  ...createZWallSegments(roomZ - HALF_ROOM_DEPTH),
])

const sharedWallColliders = roomCentersZ
  .slice(0, -1)
  .flatMap((roomZ) => createZWallSegments(roomZ - HALF_ROOM_DEPTH - 1))

const wallColliders = [
  ...roomWallColliders,
  ...sharedWallColliders,
]

const doorColliders = [
  {
    minX: -HALF_DOORWAY_WIDTH,
    maxX: HALF_DOORWAY_WIDTH,
    minZ: -5 - HALF_DOOR_PANEL_THICKNESS,
    maxZ: -5 + HALF_DOOR_PANEL_THICKNESS,
  },
  {
    minX: -HALF_DOORWAY_WIDTH,
    maxX: HALF_DOORWAY_WIDTH,
    minZ: -17 - HALF_DOOR_PANEL_THICKNESS,
    maxZ: -17 + HALF_DOOR_PANEL_THICKNESS,
  },
  {
    minX: -HALF_DOORWAY_WIDTH,
    maxX: HALF_DOORWAY_WIDTH,
    minZ: -29 - HALF_DOOR_PANEL_THICKNESS,
    maxZ: -29 + HALF_DOOR_PANEL_THICKNESS,
  },
  {
    minX: -HALF_DOORWAY_WIDTH,
    maxX: HALF_DOORWAY_WIDTH,
    minZ: -41 - HALF_DOOR_PANEL_THICKNESS,
    maxZ: -41 + HALF_DOOR_PANEL_THICKNESS,
  },
  {
    minX: -HALF_DOORWAY_WIDTH,
    maxX: HALF_DOORWAY_WIDTH,
    minZ: -53 - HALF_DOOR_PANEL_THICKNESS,
    maxZ: -53 + HALF_DOOR_PANEL_THICKNESS,
  },
]

// Door positions in Z axis (centers)
const doorPositionsZ = [-5, -17, -29, -41, -53]
const DOOR_PROXIMITY_DISTANCE = 2

const forwardVector = new THREE.Vector3()
const rightVector = new THREE.Vector3()

const keysHeld = {
  forward: false,
  backward: false,
  left: false,
  right: false,
}

let controls
let movementEnabled = false

function setupPlayerControls() {
  controls = new PointerLockControls(camera, renderer.domElement)

  controls.addEventListener("lock", () => {
    window.dispatchEvent(new CustomEvent("pointerLockChanged", { detail: true }))
  })

  controls.addEventListener("unlock", () => {
    window.dispatchEvent(new CustomEvent("pointerLockChanged", { detail: false }))
  })
}

function setKeyState(code, isPressed) {
  switch (code) {
    case "KeyW":
      keysHeld.forward = isPressed
      break
    case "KeyS":
      keysHeld.backward = isPressed
      break
    case "KeyA":
      keysHeld.left = isPressed
      break
    case "KeyD":
      keysHeld.right = isPressed
      break
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    unlockPointer()
    return
  }

  setKeyState(event.code, true)
})

window.addEventListener("keyup", (event) => {
  setKeyState(event.code, false)
})

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getActiveCollisionBoxes() {
  return [
    ...wallColliders,
    ...doorColliders.filter(Boolean),
  ]
}

function isCollidingWithBox(x, z, box) {
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ
}

function hasCollisionAt(x, z) {
  return getActiveCollisionBoxes().some((box) => isCollidingWithBox(x, z, box))
}

function getMovementDelta() {
  let forwardAmount = 0
  let rightAmount = 0

  if (keysHeld.forward) {
    forwardAmount += MOVE_SPEED
  }

  if (keysHeld.backward) {
    forwardAmount -= MOVE_SPEED
  }

  if (keysHeld.right) {
    rightAmount += MOVE_SPEED
  }

  if (keysHeld.left) {
    rightAmount -= MOVE_SPEED
  }

  camera.getWorldDirection(forwardVector)
  forwardVector.y = 0
  forwardVector.normalize()

  rightVector.crossVectors(forwardVector, camera.up).normalize()

  return {
    x: forwardVector.x * forwardAmount + rightVector.x * rightAmount,
    z: forwardVector.z * forwardAmount + rightVector.z * rightAmount,
  }
}

function removeDoorCollider(roomIndex) {
  if (roomIndex < 0 || roomIndex >= doorColliders.length) {
    return
  }

  doorColliders[roomIndex] = null
}

function getNearbyDoor(maxDistance = DOOR_PROXIMITY_DISTANCE) {
  for (let i = 0; i < doorPositionsZ.length; i++) {
    const doorZ = doorPositionsZ[i]
    const distance = Math.abs(camera.position.z - doorZ)
    
    if (distance <= maxDistance && Math.abs(camera.position.x) <= HALF_DOORWAY_WIDTH + 0.2) {
      return i
    }
  }
  return -1
}

function isPlayerNearDoor(maxDistance = DOOR_PROXIMITY_DISTANCE) {
  return getNearbyDoor(maxDistance) >= 0
}

function getPlayerNearestDoor() {
  let nearestDoorIndex = -1
  let minDistance = DOOR_PROXIMITY_DISTANCE + 1
  
  for (let i = 0; i < doorPositionsZ.length; i++) {
    const doorZ = doorPositionsZ[i]
    const distance = Math.abs(camera.position.z - doorZ)
    
    if (distance < minDistance && Math.abs(camera.position.x) <= HALF_DOORWAY_WIDTH + 0.5) {
      minDistance = distance
      nearestDoorIndex = i
    }
  }
  
  return nearestDoorIndex
}

function lockPointer() {
  if (controls && movementEnabled && !controls.isLocked) {
    controls.lock()
  }
}

function unlockPointer() {
  if (controls && controls.isLocked) {
    controls.unlock()
  }
}

function isPointerLocked() {
  return Boolean(controls && controls.isLocked)
}

function setPlayerMovementEnabled(isEnabled) {
  movementEnabled = isEnabled

  if (!movementEnabled) {
    unlockPointer()
  }
}

function updatePlayer() {
  camera.position.y = EYE_LEVEL

  if (!movementEnabled || !controls || !controls.isLocked) {
    return
  }

  const oldX = camera.position.x
  const oldZ = camera.position.z
  const delta = getMovementDelta()
  let nextX = clamp(oldX + delta.x, MIN_X, MAX_X)
  let nextZ = clamp(oldZ + delta.z, MIN_Z, MAX_Z)

  if (hasCollisionAt(nextX, oldZ)) {
    nextX = oldX
  }

  if (hasCollisionAt(nextX, nextZ)) {
    nextZ = oldZ
  }

  camera.position.x = nextX
  camera.position.y = EYE_LEVEL
  camera.position.z = nextZ
}

export {
  doorColliders,
  getPlayerNearestDoor,
  getNearbyDoor,
  isPlayerNearDoor,
  isPointerLocked,
  lockPointer,
  removeDoorCollider,
  setPlayerMovementEnabled,
  setupPlayerControls,
  unlockPointer,
  updatePlayer,
}
