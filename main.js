import * as THREE from "three"
import { resumeData } from "./data.js"
import {
  handleExhibitClick,
  isPlayerNearExhibit,
  setupExhibits,
  updateExhibitAnimations,
  exhibitFrames,
  roomLabels,
} from "./exhibits.js"
import {
  buildMuseum,
  doorPivots,
  isPlayerNearKey,
  keysCollected,
  updateKeys,
  keysArray,
} from "./museum.js"
import {
  getPlayerNearestDoor,
  getNearbyDoor,
  isPlayerNearDoor,
  isPointerLocked,
  lockPointer,
  removeDoorCollider,
  setPlayerMovementEnabled,
  setupPlayerControls,
  updatePlayer,
} from "./player.js"
import {
  hasKeyForRoom,
  getDoorState,
  setKeyForRoom,
  unlockDoorForRoom,
  isDoorUnlocked,
  setRoomVisited,
  isRoomVisited,
  getVisitedCount,
} from "./gameState.js"

const clock = new THREE.Clock()
const canvas = document.querySelector("#three-canvas")

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
})

const startScreen = document.querySelector("#start-screen")
const enterButton = document.querySelector("#enter-btn")
const infoCard = document.querySelector("#info-card")
const infoTitle = document.querySelector("#info-title")
const infoContent = document.querySelector("#info-content")
const closeCardButton = document.querySelector("#close-card")
const progressText = document.querySelector("#progress-text")
const progressFill = document.querySelector("#progress-fill")
const roomLabel = document.querySelector("#room-label")
const finalSummary = document.querySelector("#final-summary")
const resumeMessage = document.querySelector("#resume-message")
const hudMessage = document.querySelector("#hud-message")
const keyStatus = document.querySelector("#key-status")
const doorStatus = document.querySelector("#door-status")
const roomList = document.querySelector("#room-list")
const interactionHint = document.querySelector("#interaction-hint")
const interactHint = document.querySelector("#interact-hint")
const completionScreen = document.querySelector("#completion-screen")
const completionSections = document.querySelector("#completion-sections")
const hoverHint = document.querySelector("#hover-hint")

const rooms = [
  { name: "About Me", sectionName: "aboutMe", z: 0, color: "#ffc857", icon: "👤" },
  { name: "Skills", sectionName: "skills", z: -12, color: "#14f1d9", icon: "🛠️" },
  { name: "Projects", sectionName: "projects", z: -24, color: "#7ee081", icon: "💻" },
  { name: "Education", sectionName: "education", z: -36, color: "#ffa36c", icon: "🎓" },
  { name: "Achievements", sectionName: "achievements", z: -48, color: "#ffdf6e", icon: "🏆" },
]
const roomNames = rooms.map((room) => room.name)

const doorAnimations = []
const visitedRooms = new Set()
const roomEntryParticles = []
const ambientDust = []
let gameStarted = false
let hudMessageTimeout
let activeRoomSection = null
let museumCompleted = false
let startLogo
let lastRoom = -1

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 10, 5)
scene.add(directionalLight)

camera.position.set(0, 1.6, 0)

// Hover raycaster for exhibits (center crosshair)
const exhibitRaycaster = new THREE.Raycaster()
const screenCenter = new THREE.Vector2(0, 0)

setupStartLogo()
buildMuseum()
console.log('doorPivots count:', doorPivots.length)
setupExhibits()
updateLabelVisibility(-1)
setupAmbientDust()
setupRoomList()
setupPlayerControls()
renderer.domElement.addEventListener("click", handleExhibitClick)
renderer.domElement.addEventListener("click", () => {
  if (gameStarted && infoCard.classList.contains("hidden")) {
    setPlayerMovementEnabled(true)
    lockPointer()
  }
})

function updateLabelVisibility(currentRoom) {
  for (let i = 0; i < roomLabels.length; i += 1) {
    const visible = i === currentRoom
    for (const label of roomLabels[i]) {
      label.visible = visible
    }
  }
}

function enterMuseum() {
  startScreen.classList.add("hidden")
  gameStarted = true
  setPlayerMovementEnabled(true)
  lockPointer()
  updateChecklist()
}

enterButton.addEventListener("click", enterMuseum)

closeCardButton.addEventListener("click", () => {
  infoCard.classList.add("hidden")
  setPlayerMovementEnabled(true)

  if (gameStarted && !isPointerLocked()) {
    resumeMessage.classList.remove("hidden")
  }
})

function unlockDoor(index) {
  if (!doorPivots[index]) {
    console.warn("No door pivot found for index", index)
    return
  }

  doorAnimations.push({
    pivot: doorPivots[index],
    targetAngle: -Math.PI / 2,
    speed: 0.03,
  })

  const flash = new THREE.PointLight(0xffcc00, 5, 8)
  flash.position.copy(doorPivots[index].position)
  scene.add(flash)
  setTimeout(() => scene.remove(flash), 600)

  updateChecklist()
}

window.addEventListener("showCard", (event) => {
  showInfoCard(event.detail)
})

window.addEventListener("showHudMessage", (event) => {
  showHudMessage(event.detail)
})

window.addEventListener("pointerLockChanged", (event) => {
  const isLocked = event.detail

  if (!gameStarted || !infoCard.classList.contains("hidden")) {
    resumeMessage.classList.add("hidden")
    return
  }

  resumeMessage.classList.toggle("hidden", isLocked)
})

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter" && !gameStarted) {
    enterMuseum()
  }
})

document.addEventListener("keydown", (e) => {
  if (e.key !== "e" && e.key !== "E") return
  if (!gameStarted || !infoCard.classList.contains("hidden")) return

  const playerPos = camera.position

  // Key pickup check
  for (let i = 0; i < keysArray.length; i++) {
    const key = keysArray[i]
    if (!key || !key.visible) continue
    const dist = playerPos.distanceTo(key.position)
    if (dist < 2.5) {
      scene.remove(key)
      keysArray[i] = null
      setKeyForRoom(i)
      showToast("🗝️ Key collected! Now find the door.")
      updateHUD()
      return
    }
  }

  // Door unlock check
  const nearDoor = getNearbyDoor(2.5)
  if (nearDoor !== -1) {
    if (getDoorState(nearDoor) === "has_key") {
      unlockDoorForRoom(nearDoor)
      unlockDoor(nearDoor)
      removeDoorCollider(nearDoor)
      showToast("🔓 Door unlocked! Proceed.")
      updateHUD()
    } else {
      showToast("🔒 Find the key first.")
    }
  }
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

function animate() {
  requestAnimationFrame(animate)
  const time = clock.getElapsedTime()
  if (keysArray[0]) console.log('Key0 dist:', camera.position.distanceTo(keysArray[0].position).toFixed(2))

  for (let i = doorAnimations.length - 1; i >= 0; i -= 1) {
    const anim = doorAnimations[i]
    if (Math.abs(anim.pivot.rotation.y - anim.targetAngle) > 0.01) {
      anim.pivot.rotation.y += (anim.targetAngle - anim.pivot.rotation.y) * anim.speed
    } else {
      anim.pivot.rotation.y = anim.targetAngle
      doorAnimations.splice(i, 1)
    }
  }

  updatePlayer()
  updateExhibitAnimations(time)
  updateKeys(time)
  updateRoomEntryParticles(time)
  updateAmbientDust()
  const currentRoom = getCurrentRoomIndex()
  if (currentRoom !== lastRoom) {
    lastRoom = currentRoom
    updateLabelVisibility(currentRoom)
    updateChecklist()
  }
  updateRoomHud()
  updateInteractionHint()
  updateStartLogo()
  // Hover hint only: detect frames under center crosshair and toggle hint visibility
  try {
    exhibitRaycaster.setFromCamera(screenCenter, camera)
    const intersects = exhibitRaycaster.intersectObjects(exhibitFrames)
    if (intersects.length > 0) {
      if (hoverHint) hoverHint.style.display = "block"
    } else {
      if (hoverHint) hoverHint.style.display = "none"
    }
  } catch (e) {
    // swallow any errors from raycasting if exhibitFrames not ready
  }
  checkCompletion()
  renderer.render(scene, camera)
}

animate()

export { scene, camera, renderer }

function appendText(label, value) {
  if (!value) {
    return
  }

  const paragraph = document.createElement("p")
  paragraph.textContent = label ? `${label}: ${value}` : value
  infoContent.append(paragraph)
}

function appendArticle(title, details, body) {
  const article = document.createElement("article")
  const heading = document.createElement("h3")
  heading.textContent = title
  article.append(heading)

  if (details) {
    const meta = document.createElement("p")
    meta.className = "meta"
    meta.textContent = details
    article.append(meta)
  }

  if (body) {
    const paragraph = document.createElement("p")
    paragraph.textContent = body
    article.append(paragraph)
  }

  infoContent.append(article)
}

function appendContactLinks(contactItems) {
  const list = document.createElement("ul")

  contactItems.forEach((item) => {
    const listItem = document.createElement("li")
    listItem.style.marginBottom = "8px"

    if (item.includes("LinkedIn:")) {
      const link = document.createElement("a")
      link.href = "https://linkedin.com/in/haneesh-tedla-991b9a249"
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent = "LinkedIn: haneesh-tedla-991b9a249"
      link.style.color = "#0a66c2"
      link.style.textDecoration = "underline"
      link.style.cursor = "pointer"
      listItem.append(link)
    } else if (item.includes("GitHub:")) {
      const link = document.createElement("a")
      link.href = "https://github.com/TedlaHaneesh"
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent = "GitHub: TedlaHaneesh"
      link.style.color = "#333333"
      link.style.textDecoration = "underline"
      link.style.cursor = "pointer"
      listItem.append(link)
    } else {
      listItem.textContent = item
    }
    list.append(listItem)
  })

  infoContent.append(list)
}

function appendList(items) {
  const list = document.createElement("ul")

  items.forEach((item) => {
    const listItem = document.createElement("li")
    listItem.textContent = item
    list.append(listItem)
  })

  infoContent.append(list)
}

function getSkillsByName(names) {
  return resumeData.skills
    .filter((skill) => names.includes(skill.name))
    .map((skill) => `${skill.name} - ${skill.level}`)
}

function getExhibitCard(roomIndex, itemIndex) {
  const aboutMe = resumeData.aboutMe
  const education = resumeData.education[0]
  const room = rooms[roomIndex]

  if (!room) {
    return null
  }

  if (roomIndex === 0) {
    const aboutCards = [
      {
        title: aboutMe.name,
        meta: aboutMe.role,
        body: [aboutMe.summary],
      },
      {
        title: "Contact Links",
        body: [
          `Email: ${aboutMe.email}`,
          `LinkedIn: ${aboutMe.linkedin}`,
          `GitHub: ${aboutMe.github}`,
        ],
      },
      {
        title: "Fun Facts & Interests",
        body: [
          "Enjoys exploring AI/ML ideas, interactive web experiences, and creative product design.",
          "Interested in computer vision, hackathons, and building technology that feels useful and polished.",
        ],
      },
    ]

    return aboutCards[itemIndex]
  }

  if (roomIndex === 1) {
    const skillCards = [
      {
        title: "Programming Languages",
        body: getSkillsByName(["C", "C++", "JavaScript", "SQL"]),
      },
      {
        title: "Frameworks & Tools",
        body: getSkillsByName([
          "HTML5",
          "CSS3",
          "ReactJS",
          "PyTorch",
          "Machine Learning",
          "Computer Vision",
          "Three.js",
          "React Three Fiber",
          "DevOps",
        ]),
      },
      {
        title: "Design & Soft Skills",
        body: getSkillsByName([
          "Responsive Web Design",
          "Figma",
          "Wireframing",
          "Prototyping",
          "Canva",
          "Logo Designing",
        ]),
      },
    ]

    return skillCards[itemIndex]
  }

  if (roomIndex === 2) {
    const project = resumeData.projects[itemIndex]

    if (!project) {
      return null
    }

    return {
      title: project.title,
      meta: project.tech,
      body: [project.description],
    }
  }

  if (roomIndex === 3) {
    const educationCards = [
      {
        title: education.degree,
        meta: `${education.college} | ${education.year}`,
        body: [`GPA: ${education.gpa}`],
      },
      {
        title: "Relevant Coursework & Electives",
        body: [
          "Computer Science fundamentals, machine learning, computer vision, deep learning, databases, web development, and software engineering.",
        ],
      },
      {
        title: "Academic Achievements",
        body: [
          `Current academic standing: ${education.gpa}`,
          "State 3rd Rank in TSBIE Class XII",
          "Strong academic performance across secondary, intermediate, and undergraduate study.",
        ],
      },
    ]

    return educationCards[itemIndex]
  }

  if (roomIndex === 4) {
    const achievement = resumeData.achievements[itemIndex]

    if (!achievement) {
      return null
    }

    return {
      title: achievement.title,
      meta: `${achievement.issuer} | ${achievement.year}`,
      body: [],
    }
  }

  return null
}

function showInfoCard(detail) {
  const roomIndex = typeof detail === "object" ? detail.room : rooms.findIndex((room) => room.sectionName === detail)
  const itemIndex = typeof detail === "object" ? detail.item : 0
  const room = rooms[roomIndex]
  const card = getExhibitCard(roomIndex, itemIndex)

  if (!room || !card) {
    return
  }

  infoTitle.textContent = `${room.icon} ${card.title}`
  infoContent.replaceChildren()
  infoCard.style.borderTop = `5px solid ${room.color}`

  if (card.meta) {
    appendText(null, card.meta)
  }

  // Special handling for contact links card
  if (roomIndex === 0 && itemIndex === 1) {
    appendContactLinks(card.body)
  } else if (card.body.length > 1) {
    appendList(card.body)
  } else {
    card.body.forEach((body) => {
      appendText(null, body)
    })
  }

  infoCard.classList.remove("hidden")
  setPlayerMovementEnabled(false)
  resumeMessage.classList.add("hidden")
}

function getCurrentRoom() {
  return rooms.find((room) => Math.abs(camera.position.z - room.z) <= 5)
}

function getCurrentRoomIndex() {
  return rooms.findIndex((room) => Math.abs(camera.position.z - room.z) <= 5)
}

function updateRoomHud() {
  const currentRoomIndex = getCurrentRoomIndex()
  const currentRoom = rooms[currentRoomIndex]

  if (currentRoom) {
    if (activeRoomSection !== currentRoom.sectionName) {
      spawnRoomEntryParticles(currentRoom)
      activeRoomSection = currentRoom.sectionName
    }

    visitedRooms.add(currentRoom.sectionName)
    setRoomVisited(currentRoomIndex)
    roomLabel.textContent = currentRoom.name
    updateRoomStatus(currentRoomIndex)
  } else {
    activeRoomSection = null
    roomLabel.textContent = "Corridor"
    keyStatus.classList.remove("collected")
    doorStatus.textContent = "🔒 Find the next room"
  }

  const visitedCount = getVisitedCount()
  progressText.textContent = `Rooms Visited: ${visitedCount} / ${rooms.length}`
  progressFill.style.width = `${(visitedCount / rooms.length) * 100}%`

  if (visitedCount === rooms.length) {
    finalSummary.classList.remove("hidden")
  }

  updateRoomList()
}

function showHudMessage(detail) {
  const message = typeof detail === "object" ? detail.message : detail
  const duration = typeof detail === "object" && detail.duration ? detail.duration : 2600

  hudMessage.textContent = message
  hudMessage.classList.remove("hidden")

  window.clearTimeout(hudMessageTimeout)
  hudMessageTimeout = window.setTimeout(() => {
    hudMessage.classList.add("hidden")
  }, duration)
}

function showToast(message) {
  showHudMessage(message)
}

function updateHUD() {
  updateRoomHud()
  updateChecklist()
}

function spawnRoomEntryParticles(room) {
  const materialColor = new THREE.Color(room.color)

  for (let index = 0; index < 20; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: materialColor,
      transparent: true,
      opacity: 0.85,
    })
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      material,
    )

    particle.position.set(
      (Math.random() - 0.5) * 3,
      0.25 + Math.random() * 0.8,
      room.z + (Math.random() - 0.5) * 3,
    )
    particle.userData = {
      createdAt: clock.getElapsedTime(),
      driftX: (Math.random() - 0.5) * 0.01,
      driftZ: (Math.random() - 0.5) * 0.01,
    }

    scene.add(particle)
    roomEntryParticles.push(particle)
  }
}

function updateRoomEntryParticles(time) {
  for (let index = roomEntryParticles.length - 1; index >= 0; index -= 1) {
    const particle = roomEntryParticles[index]
    const age = time - particle.userData.createdAt
    const progress = age / 2

    particle.position.y += 0.025
    particle.position.x += particle.userData.driftX
    particle.position.z += particle.userData.driftZ
    particle.material.opacity = Math.max(1 - progress, 0)

    if (progress >= 1) {
      scene.remove(particle)
      particle.geometry.dispose()
      particle.material.dispose()
      roomEntryParticles.splice(index, 1)
    }
  }
}

function setupAmbientDust() {
  const dustMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
  })

  for (let index = 0; index < 50; index += 1) {
    const dust = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      dustMaterial,
    )

    dust.position.set(
      (Math.random() - 0.5) * 2.2,
      Math.random() * 3.7 + 0.15,
      -6 - Math.random() * 36,
    )
    dust.userData = {
      speed: 0.003 + Math.random() * 0.006,
    }

    scene.add(dust)
    ambientDust.push(dust)
  }
}

function updateAmbientDust() {
  ambientDust.forEach((dust) => {
    dust.position.y += dust.userData.speed

    if (dust.position.y > 3.8) {
      dust.position.y = 0.15
    }
  })
}

function setupStartLogo() {
  const geometry = new THREE.TorusGeometry(0.8, 0.16, 20, 64)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd84d,
    emissive: 0xffb000,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.7,
  })

  startLogo = new THREE.Mesh(geometry, material)
  startLogo.position.set(0, 1.75, -3)
  scene.add(startLogo)
}

function updateStartLogo() {
  if (!startLogo) {
    return
  }

  startLogo.visible = !gameStarted
  startLogo.rotation.x += 0.006
  startLogo.rotation.y += 0.012
}

function setupRoomList() {
  rooms.forEach((room, index) => {
    const item = document.createElement("div")
    item.id = `check-${index}`
    item.className = "room-list-item"
    item.dataset.roomIndex = index
    item.textContent = `⬜ ${room.name}`
    roomList.append(item)
  })
}

function updateChecklist() {
  for (let i = 0; i < rooms.length; i += 1) {
    const item = document.getElementById(`check-${i}`)
    if (!item) continue

    const isComplete = isDoorUnlocked(i) || isRoomVisited(i)
    item.innerHTML = isComplete ? `✅ ${roomNames[i]}` : `⬜ ${roomNames[i]}`
    item.style.color = isComplete ? "#4ade80" : "#ffffff"
    item.style.textDecoration = isComplete ? "line-through" : "none"
  }
}

function updateRoomStatus(roomIndex) {
  const doorStateValue = getDoorState(roomIndex)
  const keyForRoom = hasKeyForRoom(roomIndex)
  
  // Update key icon: gold when key is collected
  keyStatus.classList.toggle("collected", keyForRoom)
  keyStatus.textContent = keyForRoom ? "🗝️" : "🗝️"
  
  // Update door icon based on door state
  if (doorStateValue === "unlocked") {
    doorStatus.textContent = "🔓 Door unlocked"
  } else if (doorStateValue === "has_key") {
    doorStatus.textContent = "🔒 Key collected"
  } else {
    doorStatus.textContent = "🔒 Door locked"
  }
}

function updateRoomList() {
  updateChecklist()
}

function updateInteractionHint() {
  const shouldShowExhibitHint =
    gameStarted &&
    infoCard.classList.contains("hidden") &&
    document.pointerLockElement === renderer.domElement &&
    isPlayerNearExhibit(2)

  const shouldShowKeyHint =
    gameStarted &&
    infoCard.classList.contains("hidden") &&
    document.pointerLockElement === renderer.domElement &&
    isPlayerNearKey(2) &&
    !isPlayerNearKey(1.2)

  let shouldShowDoorHint = false
  let doorHintText = ""

  if (gameStarted && infoCard.classList.contains("hidden") && document.pointerLockElement === renderer.domElement && isPlayerNearDoor(2)) {
    const doorIndex = getPlayerNearestDoor()
    if (doorIndex >= 0) {
      const doorStateValue = getDoorState(doorIndex)
      const keyForRoom = hasKeyForRoom(doorIndex)
      
      if (doorStateValue === "unlocked") {
        shouldShowDoorHint = false  // Don't show hint for unlocked doors
      } else if (keyForRoom) {
        doorHintText = "Press E to use key and unlock door 🗝️🔓"
        shouldShowDoorHint = true
      } else {
        doorHintText = "🔒 This door is locked. Find the key first."
        shouldShowDoorHint = true
      }
    }
  }

  // Update door hint element if it exists, otherwise we can reuse interactHint or create logic
  if (shouldShowDoorHint) {
    // Try to use an existing element or create dynamic behavior
    // For now, we'll update interactHint to show door hints
    interactHint.textContent = doorHintText
    interactHint.classList.remove("hidden")
  } else {
    interactionHint.classList.toggle("hidden", !shouldShowExhibitHint)
    interactHint.classList.toggle("hidden", !shouldShowKeyHint)
  }
}

function checkCompletion() {
  if (museumCompleted || keysCollected.length < rooms.length) {
    return
  }

  if (rooms.every((_, index) => keysCollected[index])) {
    museumCompleted = true
    finalSummary.classList.add("hidden")
    showCompletionScreen()
  }
}

function showCompletionScreen() {
  setPlayerMovementEnabled(false)
  completionSections.replaceChildren()

  const sections = [
    {
      title: "About Me",
      body: `${resumeData.aboutMe.name} - ${resumeData.aboutMe.role}. ${resumeData.aboutMe.summary}`,
    },
    {
      title: "Skills",
      body: resumeData.skills.map((skill) => skill.name).join(", "),
    },
    {
      title: "Projects",
      body: resumeData.projects.map((project) => project.title).join(", "),
    },
    {
      title: "Education",
      body: resumeData.education
        .map((item) => `${item.degree}, ${item.college} (${item.year})`)
        .join("; "),
    },
    {
      title: "Achievements",
      body: resumeData.achievements.map((achievement) => achievement.title).join("; "),
    },
  ]

  sections.forEach((section) => {
    const article = document.createElement("article")
    article.className = "completion-section"

    const title = document.createElement("h3")
    title.textContent = section.title
    article.append(title)

    const body = document.createElement("p")
    body.textContent = section.body
    article.append(body)

    completionSections.append(article)
  })

  completionScreen.classList.remove("hidden")
}
