import * as THREE from "three"
import { camera, scene } from "./main.js"
import { removeDoorCollider } from "./player.js"
import { setKeyForRoom, unlockDoorForRoom, hasKeyForRoom, getDoorState } from "./gameState.js"

const ROOM_WIDTH = 10
const ROOM_HEIGHT = 4
const ROOM_DEPTH = 10
const WALL_THICKNESS = 0.2
const DOOR_WIDTH = 2.6
const DOOR_HEIGHT = 2.7
const CORRIDOR_DEPTH = 2
const CORRIDOR_WIDTH = DOOR_WIDTH
const TRIM_HEIGHT = 0.12
const BORDER_THICKNESS = 0.08
const DOOR_FRAME_THICKNESS = 0.18
const DOOR_PANEL_THICKNESS = 0.15
const DOOR_OPEN_FRAMES = 60
const DOOR_OPEN_ROTATION = -Math.PI / 2
const KEY_PICKUP_DISTANCE = 1.2

const doors = []
const doorFlashes = []
export const doorPivots = []
const roomState = []
const keys = []
const keysArray = keys
const keysCollected = []

const roomThemes = [
  {
    name: "About Me",
    wall: 0xd8b98b,
    floor: 0x7a4f2a,
    ceiling: 0xfff3d7,
    accent: 0xffc857,
    border: 0x5c371c,
    trim: 0xffe4b8,
  },
  {
    name: "Skills",
    wall: 0x071a3d,
    floor: 0x1f2329,
    ceiling: 0x17213a,
    accent: 0x14f1d9,
    border: 0x9fb9ff,
    trim: 0x4b72c2,
  },
  {
    name: "Projects",
    wall: 0x123d2a,
    floor: 0x777d80,
    ceiling: 0xd7ddd8,
    accent: 0x7ee081,
    border: 0xd8c99b,
    trim: 0x8ec3a7,
  },
  {
    name: "Education",
    wall: 0x5b1424,
    floor: 0x8a5a2b,
    ceiling: 0xf3d6c4,
    accent: 0xffa36c,
    border: 0xf2c078,
    trim: 0xb7795f,
  },
  {
    name: "Achievements",
    wall: 0x3b176d,
    floor: 0xb89131,
    ceiling: 0xeadfff,
    accent: 0xffdf6e,
    border: 0xffffff,
    trim: 0xd6b8ff,
  },
]

const corridorMaterial = new THREE.MeshStandardMaterial({
  color: 0x2c3036,
  roughness: 0.72,
})
const corridorFloorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1f24,
  roughness: 0.78,
})
const corridorLineMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.38,
})
const plateMaterial = new THREE.MeshStandardMaterial({
  color: 0x4fd1c5,
  emissive: 0x1b6f6a,
  roughness: 0.35,
})
const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x3b2414,
  roughness: 0.5,
  metalness: 0.03,
})
const doorFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d2008,
  roughness: 0.55,
  metalness: 0.12,
})
const keyMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd84d,
  emissive: 0xffb000,
  emissiveIntensity: 1.2,
  roughness: 0.25,
  metalness: 0.65,
})

const keyPositions = [
  { x: 2, y: 0.8, z: -3 },
  { x: -2, y: 0.8, z: -15 },
  { x: 2, y: 0.8, z: -27 },
  { x: -2, y: 0.8, z: -39 },
  { x: 2, y: 0.8, z: -50 },
]

function createMaterial(color, roughness = 0.62, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function createAccentMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.32,
  })
}

function addBox(width, height, depth, x, y, z, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(x, y, z)
  scene.add(mesh)
  return mesh
}

function addDoorWall(z, roomZ, roomName, theme) {
  const sideWidth = (ROOM_WIDTH - DOOR_WIDTH) / 2
  const sideX = DOOR_WIDTH / 2 + sideWidth / 2
  const topHeight = ROOM_HEIGHT - DOOR_HEIGHT
  const topY = DOOR_HEIGHT + topHeight / 2

  addBox(sideWidth, ROOM_HEIGHT, WALL_THICKNESS, -sideX, ROOM_HEIGHT / 2, z, theme.wallMaterial)
  addBox(sideWidth, ROOM_HEIGHT, WALL_THICKNESS, sideX, ROOM_HEIGHT / 2, z, theme.wallMaterial)
  addBox(DOOR_WIDTH, topHeight, WALL_THICKNESS, 0, topY, z, theme.wallMaterial)

  const plateZ = z > roomZ ? z - WALL_THICKNESS : z + WALL_THICKNESS
  const namePlate = addBox(DOOR_WIDTH, 0.25, 0.12, 0, DOOR_HEIGHT + 0.35, plateZ, plateMaterial)
  namePlate.name = `${roomName} name plate`

  addBox(ROOM_WIDTH, TRIM_HEIGHT, 0.08, 0, ROOM_HEIGHT - 0.45, plateZ, theme.trimMaterial)
}

function addFloorBorder(roomZ, theme) {
  const y = 0.04
  const edgeZ = ROOM_DEPTH / 2 - BORDER_THICKNESS / 2
  const edgeX = ROOM_WIDTH / 2 - BORDER_THICKNESS / 2

  addBox(ROOM_WIDTH, BORDER_THICKNESS, BORDER_THICKNESS, 0, y, roomZ + edgeZ, theme.borderMaterial)
  addBox(ROOM_WIDTH, BORDER_THICKNESS, BORDER_THICKNESS, 0, y, roomZ - edgeZ, theme.borderMaterial)
  addBox(BORDER_THICKNESS, BORDER_THICKNESS, ROOM_DEPTH, -edgeX, y, roomZ, theme.borderMaterial)
  addBox(BORDER_THICKNESS, BORDER_THICKNESS, ROOM_DEPTH, edgeX, y, roomZ, theme.borderMaterial)
}

function addSideWallTrim(roomZ, theme) {
  const sideX = ROOM_WIDTH / 2 - WALL_THICKNESS
  const y = ROOM_HEIGHT - 0.45

  addBox(0.08, TRIM_HEIGHT, ROOM_DEPTH, -sideX, y, roomZ, theme.trimMaterial)
  addBox(0.08, TRIM_HEIGHT, ROOM_DEPTH, sideX, y, roomZ, theme.trimMaterial)
}

function addSpotlightCones(roomZ, theme) {
  const positions = [
    { x: -4.55, z: roomZ - 2.4 },
    { x: 4.55, z: roomZ },
    { x: -4.55, z: roomZ + 2.4 },
  ]
  const geometry = new THREE.ConeGeometry(0.28, 0.55, 24)

  positions.forEach((position) => {
    const cone = new THREE.Mesh(geometry, theme.accentMaterial)
    cone.position.set(position.x, ROOM_HEIGHT - 0.35, position.z)
    cone.rotation.x = Math.PI
    scene.add(cone)
  })
}

function addRoomLight(roomZ, theme) {
  const roomLight = new THREE.PointLight(theme.accent, 1.5, 15)
  roomLight.position.set(0, ROOM_HEIGHT - 0.8, roomZ)
  scene.add(roomLight)
}

function addKey(roomZ, roomIndex) {
  const position = keyPositions[roomIndex]
  const key = new THREE.Object3D()
  key.position.set(position.x, position.y, position.z)
  key.scale.setScalar(0.6)
  key.userData = {
    roomIndex,
    baseY: position.y,
    phase: roomIndex * 0.8,
  }

  const ringGeometry = new THREE.TorusGeometry(0.15, 0.04, 12, 32)
  const ring = new THREE.Mesh(ringGeometry, keyMaterial)
  ring.rotation.y = Math.PI / 2
  ring.position.x = -0.14
  key.add(ring)

  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 16)
  const stem = new THREE.Mesh(stemGeometry, keyMaterial)
  stem.rotation.z = Math.PI / 2
  stem.position.x = 0.08
  key.add(stem)

  const toothGeometry = new THREE.BoxGeometry(0.09, 0.05, 0.05)
  const tooth = new THREE.Mesh(toothGeometry, keyMaterial)
  tooth.position.set(0.2, -0.06, 0)
  key.add(tooth)

  const glow = new THREE.PointLight(0xffd84d, 0.45, 3)
  glow.position.set(0, 0, 0)
  key.add(glow)
  key.userData.glow = glow

  scene.add(key)
  keys[roomIndex] = key
  keysCollected[roomIndex] = false
  roomState[roomIndex] = { keyCollected: false }
}

function getNearbyKey(maxDistance) {
  return keys.find((key, roomIndex) => {
    if (!key || keysCollected[roomIndex]) {
      return false
    }

    return camera.position.distanceTo(key.position) <= maxDistance
  })
}

function addExitDoor(backZ, roomIndex) {
  const frameZ = backZ + 0.02
  const frameSideX = DOOR_WIDTH / 2 + DOOR_FRAME_THICKNESS / 2
  const frameTopY = DOOR_HEIGHT + DOOR_FRAME_THICKNESS / 2
  const frameBottomY = DOOR_FRAME_THICKNESS / 2

  const frameDepth = 0.2
  const frameSideWidth = 0.1
  const frameTopHeight = 0.1

  addBox(
    frameSideWidth,
    DOOR_HEIGHT,
    frameDepth,
    -DOOR_WIDTH / 2 - frameSideWidth / 2,
    DOOR_HEIGHT / 2,
    frameZ,
    doorFrameMaterial,
  )
  addBox(
    frameSideWidth,
    DOOR_HEIGHT,
    frameDepth,
    DOOR_WIDTH / 2 + frameSideWidth / 2,
    DOOR_HEIGHT / 2,
    frameZ,
    doorFrameMaterial,
  )
  addBox(
    DOOR_WIDTH + frameSideWidth * 2,
    frameTopHeight,
    frameDepth,
    0,
    DOOR_HEIGHT + frameTopHeight / 2,
    frameZ,
    doorFrameMaterial,
  )

  const doorWidth = DOOR_WIDTH
  const doorHeight = DOOR_HEIGHT
  const doorDepth = Math.max(DOOR_PANEL_THICKNESS, 0.15)
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth)
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    side: THREE.FrontSide,
  })
  const doorPanel = new THREE.Mesh(doorGeo, doorMat)
  doorPanel.position.set(doorWidth / 2, doorHeight / 2, 0)
  doorPanel.castShadow = true

  const pivot = new THREE.Object3D()
  pivot.position.set(-doorWidth / 2, 0, frameZ)
  pivot.add(doorPanel)
  scene.add(pivot)
  doorPivots[roomIndex] = pivot

  doors[roomIndex] = {
    pivot,
    flashPosition: new THREE.Vector3(0, DOOR_HEIGHT * 0.72, frameZ),
    frame: 0,
    isOpening: false,
    isOpen: false,
  }
}

function addRoom(roomZ, theme, roomIndex) {
  const floorY = -WALL_THICKNESS / 2
  const ceilingY = ROOM_HEIGHT + WALL_THICKNESS / 2
  const frontZ = roomZ + ROOM_DEPTH / 2
  const backZ = roomZ - ROOM_DEPTH / 2
  const sideX = ROOM_WIDTH / 2

  addBox(ROOM_WIDTH, WALL_THICKNESS, ROOM_DEPTH, 0, floorY, roomZ, theme.floorMaterial)
  addBox(ROOM_WIDTH, WALL_THICKNESS, ROOM_DEPTH, 0, ceilingY, roomZ, theme.ceilingMaterial)

  addBox(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH, -sideX, ROOM_HEIGHT / 2, roomZ, theme.wallMaterial)
  addBox(WALL_THICKNESS, ROOM_HEIGHT, ROOM_DEPTH, sideX, ROOM_HEIGHT / 2, roomZ, theme.wallMaterial)

  addDoorWall(frontZ, roomZ, theme.name, theme)
  addDoorWall(backZ, roomZ, theme.name, theme)
  addFloorBorder(roomZ, theme)
  addSideWallTrim(roomZ, theme)
  addSpotlightCones(roomZ, theme)
  addRoomLight(roomZ, theme)
  addExitDoor(backZ, roomIndex)
  addKey(roomZ, roomIndex)
}

function addCorridor(corridorZ) {
  const floorY = -WALL_THICKNESS / 2
  const ceilingY = ROOM_HEIGHT + WALL_THICKNESS / 2
  const sideX = CORRIDOR_WIDTH / 2

  addBox(CORRIDOR_WIDTH, WALL_THICKNESS, CORRIDOR_DEPTH, 0, floorY, corridorZ, corridorFloorMaterial)
  addBox(CORRIDOR_WIDTH, WALL_THICKNESS, CORRIDOR_DEPTH, 0, ceilingY, corridorZ, corridorMaterial)
  addBox(WALL_THICKNESS, ROOM_HEIGHT, CORRIDOR_DEPTH, -sideX, ROOM_HEIGHT / 2, corridorZ, corridorMaterial)
  addBox(WALL_THICKNESS, ROOM_HEIGHT, CORRIDOR_DEPTH, sideX, ROOM_HEIGHT / 2, corridorZ, corridorMaterial)
  addBox(0.06, 0.03, CORRIDOR_DEPTH, -0.75, 0.03, corridorZ, corridorLineMaterial)
  addBox(0.06, 0.03, CORRIDOR_DEPTH, 0.75, 0.03, corridorZ, corridorLineMaterial)
}

function buildMuseum() {
  roomThemes.forEach((theme, index) => {
    const roomZ = index * -12
    const roomTheme = {
      ...theme,
      wallMaterial: createMaterial(theme.wall, 0.68),
      floorMaterial: createMaterial(theme.floor, 0.58),
      ceilingMaterial: createMaterial(theme.ceiling, 0.72),
      borderMaterial: createMaterial(theme.border, 0.42),
      trimMaterial: createMaterial(theme.trim, 0.45),
      accentMaterial: createAccentMaterial(theme.accent),
    }

    addRoom(roomZ, roomTheme, index)

    if (index < roomThemes.length - 1) {
      addCorridor(roomZ - 6)
    }
  })
}

function unlockDoor(roomIndex) {
  const door = doors[roomIndex]

  if (!door || door.isOpen || door.isOpening) {
    return
  }

  // Check if player has the key for this room
  if (!hasKeyForRoom(roomIndex)) {
    window.dispatchEvent(
      new CustomEvent("showHudMessage", {
        detail: {
          message: "You don't have the key for this door.",
          duration: 2000,
        },
      }),
    )
    return
  }

  // Unlock the door and consume the key
  unlockDoorForRoom(roomIndex)  // Update game state: doorState -> "unlocked", keyCollected -> false
  removeDoorCollider(roomIndex)
  door.isOpening = true
  
  const flash = new THREE.PointLight(0xffd84d, 5, 6)
  flash.position.copy(door.flashPosition)
  scene.add(flash)
  doorFlashes.push({
    light: flash,
    frame: 0,
  })

  window.dispatchEvent(
    new CustomEvent("showHudMessage", {
      detail: {
        message: "🔓 Door unlocked! Proceed to the next room.",
        duration: 2000,
      },
    }),
  )
}

function collectKey(roomIndex) {
  const key = keys[roomIndex]

  if (!key || keysCollected[roomIndex]) {
    return
  }

  keysCollected[roomIndex] = true
  roomState[roomIndex].keyCollected = true
  setKeyForRoom(roomIndex)  // Update game state: doorState -> "has_key"
  scene.remove(key)

  window.dispatchEvent(
    new CustomEvent("showHudMessage", {
      detail: {
        message: "🗝️ Key collected! Now find the door.",
        duration: 2000,
      },
    }),
  )
}

function collectNearbyKey() {
  const key = getNearbyKey(KEY_PICKUP_DISTANCE)

  if (!key) {
    return false
  }

  collectKey(key.userData.roomIndex)
  return true
}

function isPlayerNearKey(maxDistance) {
  return Boolean(getNearbyKey(maxDistance))
}

function updateKeys(time) {
  keys.forEach((key, roomIndex) => {
    if (!key || keysCollected[roomIndex]) {
      return
    }

    const { baseY, glow, phase } = key.userData
    key.rotation.y += 0.025
    key.position.y = baseY + Math.sin(time * 2.4 + phase) * 0.16
    glow.intensity = 1.25 + Math.sin(time * 3 + phase) * 0.75

  })
}

function updateDoorAnimations() {
  doors.forEach((door) => {
    if (!door.isOpening || door.isOpen) {
      return
    }

    door.frame += 1
    const progress = Math.min(door.frame / DOOR_OPEN_FRAMES, 1)
    door.pivot.rotation.y = DOOR_OPEN_ROTATION * progress

    if (progress === 1) {
      door.isOpening = false
      door.isOpen = true
    }
  })

  for (let index = doorFlashes.length - 1; index >= 0; index -= 1) {
    const flash = doorFlashes[index]
    flash.frame += 1
    flash.light.intensity = 5 * (1 - flash.frame / 30)

    if (flash.frame >= 30) {
      scene.remove(flash.light)
      doorFlashes.splice(index, 1)
    }
  }
}

export {
  buildMuseum,
  collectNearbyKey,
  isPlayerNearKey,
  keysCollected,
  keysArray,
  roomState,
  unlockDoor,
  updateDoorAnimations,
  updateKeys,
}
