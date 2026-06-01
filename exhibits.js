import * as THREE from "three"
import { scene, camera, renderer } from "./main.js"

const clickableExhibits = []
const roomLabels = [[], [], [], [], []]
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const exhibitMaterial = new THREE.MeshLambertMaterial({
  color: 0x14f1d9,
  emissive: 0x0b8f81,
})

const goldExhibitMaterial = new THREE.MeshLambertMaterial({
  color: 0xffc857,
  emissive: 0xa66b00,
})

const roomSections = [
  { roomName: "About Me", z: 0 },
  { roomName: "Skills", z: -12 },
  { roomName: "Projects", z: -24 },
  { roomName: "Education", z: -36 },
  { roomName: "Achievements", z: -48 },
]

const exhibitPositions = [
  { x: -4.88, y: 2.1, zOffset: -2.4, rotationY: Math.PI / 2 },
  { x: 4.88, y: 2.1, zOffset: 0, rotationY: -Math.PI / 2 },
  { x: -4.88, y: 2.1, zOffset: 2.4, rotationY: Math.PI / 2 },
]

function createExhibit(room, roomIndex, itemIndex) {
  const position = exhibitPositions[itemIndex]
  const geometry = new THREE.PlaneGeometry(1.7, 1.2)
  const material = itemIndex % 2 === 0 ? exhibitMaterial : goldExhibitMaterial
  const exhibit = new THREE.Mesh(geometry, material)

  exhibit.position.set(position.x, position.y, room.z + position.zOffset)
  exhibit.rotation.y = position.rotationY
  exhibit.userData = {
    type: "exhibit",
    roomIndex,
    roomName: room.roomName,
    itemIndex,
    baseY: position.y,
    baseRotationY: position.rotationY,
    phase: roomIndex * 0.7 + itemIndex * 0.35,
  }

  scene.add(exhibit)
  clickableExhibits.push(exhibit)

  // Add a title plate label mounted on the bottom front of the exhibit frame
  const headings = [
    ["Who Am I", "Contact", "Fun Facts"],
    ["Languages", "Frameworks", "Soft Skills"],
    ["Project 1", "Project 2", "Project 3"],
    ["Degree", "Coursework", "Academics"],
    ["Achievement 1", "Achievement 2", "Achievement 3"],
  ]

  function makeLabel(text, frameWidth, frameHeight) {
    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 80
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "rgba(0,0,0,0.6)"
    ctx.fillRect(0, 0, 512, 80)
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 30px Arial"
    ctx.textAlign = "center"
    ctx.fillText(text, 256, 52)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    const geo = new THREE.PlaneGeometry((frameWidth || 1.7) * 0.95, 0.22)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.renderOrder = 999
    return mesh
  }

  const labelText = (headings[roomIndex] && headings[roomIndex][itemIndex]) || ""
  if (labelText) {
    const frameWidth = geometry.parameters && geometry.parameters.width ? geometry.parameters.width : 1.7
    const frameHeight = geometry.parameters && geometry.parameters.height ? geometry.parameters.height : 1.2
    const label = makeLabel(labelText, frameWidth, frameHeight)

    // position the label flush to the front of the exhibit frame,
    // using the frame normal and placing it at the bottom of the frame
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(exhibit.rotation).normalize()
    label.position.copy(exhibit.position)
    label.position.y = exhibit.position.y - frameHeight / 2 + 0.15
    label.position.addScaledVector(normal, 0.07)
    label.rotation.copy(exhibit.rotation)
    scene.add(label)
    roomLabels[roomIndex].push(label)
  }
}

function setupExhibits() {
  roomSections.forEach((room, roomIndex) => {
    for (let itemIndex = 0; itemIndex < exhibitPositions.length; itemIndex += 1) {
      createExhibit(room, roomIndex, itemIndex)
    }
  })
}

function handleExhibitClick() {
  if (document.pointerLockElement !== renderer.domElement) {
    return
  }

  pointer.set(0, 0)
  raycaster.setFromCamera(pointer, camera)

  const [hit] = raycaster.intersectObjects(clickableExhibits)

  if (!hit) {
    return
  }

  const { roomIndex, itemIndex } = hit.object.userData

  window.dispatchEvent(
    new CustomEvent("showCard", {
      detail: {
        room: roomIndex,
        item: itemIndex,
      },
    }),
  )
}

function isPlayerNearExhibit(maxDistance = 2) {
  return clickableExhibits.some((exhibit) => {
    return camera.position.distanceTo(exhibit.position) <= maxDistance
  })
}

function updateExhibitAnimations(time) {
  clickableExhibits.forEach((exhibit) => {
    const { baseY, baseRotationY, phase } = exhibit.userData
    exhibit.position.y = baseY + Math.sin(time + phase) * 0.05
    exhibit.rotation.y = baseRotationY + Math.sin(time * 0.5 + phase) * 0.02
  })
}

export {
  setupExhibits,
  handleExhibitClick,
  isPlayerNearExhibit,
  updateExhibitAnimations,
  clickableExhibits as exhibitFrames,
  roomLabels,
}
