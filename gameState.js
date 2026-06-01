// Game state machine for door unlock system
// Each room has a doorState and keyCollected flag

const ROOM_COUNT = 5

// Initialize state arrays
const doorState = Array(ROOM_COUNT).fill("locked")      // "locked" | "has_key" | "unlocked"
const keyCollected = Array(ROOM_COUNT).fill(false)       // true when key is picked up
const visitedRooms = Array(ROOM_COUNT).fill(false)      // true when room has been entered

// Set key for specific room
function setKeyForRoom(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    doorState[roomIndex] = "has_key"
    keyCollected[roomIndex] = true
  }
}

// Unlock door when player uses key
function unlockDoorForRoom(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    doorState[roomIndex] = "unlocked"
    keyCollected[roomIndex] = false  // Key is consumed
  }
}

// Get door state for a room
function getDoorState(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    return doorState[roomIndex]
  }
  return null
}

// Check if player has key for a room
function hasKeyForRoom(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    return keyCollected[roomIndex]
  }
  return false
}

// Check if door is unlocked
function isDoorUnlocked(roomIndex) {
  return getDoorState(roomIndex) === "unlocked"
}

function setRoomVisited(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    visitedRooms[roomIndex] = true
  }
}

function isRoomVisited(roomIndex) {
  if (roomIndex >= 0 && roomIndex < ROOM_COUNT) {
    return visitedRooms[roomIndex]
  }
  return false
}

function getVisitedCount() {
  return visitedRooms.filter(Boolean).length
}

// Get player's current room index based on z position
function getCurrentRoomIndex(cameraZ) {
  const roomSpacing = 12
  const zPositions = [0, -12, -24, -36, -48]
  
  for (let i = 0; i < zPositions.length; i++) {
    if (Math.abs(cameraZ - zPositions[i]) <= 5) {
      return i
    }
  }
  return -1  // In corridor
}

export {
  doorState,
  keyCollected,
  setKeyForRoom,
  unlockDoorForRoom,
  getDoorState,
  hasKeyForRoom,
  isDoorUnlocked,
  setRoomVisited,
  isRoomVisited,
  getVisitedCount,
  getCurrentRoomIndex,
  ROOM_COUNT,
}
