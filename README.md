# Haneesh Tedla - Interactive 3D Resume

A browser-based 3D interactive resume built with Three.js. Instead of a static page, the experience lets you walk through a first-person 3D environment where each section of my resume is a room you explore, complete with collectibles, locked doors, and clickable exhibits.

---

## Live Demo

🔗 [View Live](https://haneeshtedlainteractiveresume.netlify.app/)

---

## What It Does

You navigate a first-person 3D world across 5 rooms, each representing a section of my resume:

- **Room 1** - About Me
- **Room 2** - Skills
- **Room 3** - Projects
- **Room 4** - Education
- **Room 5** - Achievements & Certifications

Each room has clickable frames that reveal detailed content. To move to the next room, you find a hidden key and use it to unlock the door - a deliberate mechanic that keeps the experience engaging rather than passive.

---

## Controls

| Action | Key / Input |
|---|---|
| Move | W A S D |
| Look around | Mouse |
| Pick up key / Interact | E |
| Click exhibit | Left click |
| Unlock pointer | Escape |

---

## Game Mechanics

- **Key collection** - A glowing key is hidden in each room. Walk up to it and press E to pick it up.
- **Door unlock** - Approach the door with a key and press E to unlock it. The door physically swings open.
- **Click to explore** - Each room has exhibit frames on the walls. Click them to read detailed resume content.
- **Progress tracking** - A checklist on the HUD tracks which rooms you've completed.
- **Hover detection** - Looking at a frame shows a prompt so you always know what's interactable.

---

## Tech Stack

- **Three.js** - 3D scene, geometry, lighting, raycasting
- **Vite** - Dev server and build tool
- **Vanilla JavaScript** - No frameworks, clean ES module structure
- **HTML + CSS** - HUD overlay, info cards, start screen

---

## Project Structure

```
├── index.html       # HUD, overlays, start screen
├── style.css        # All UI styling
├── main.js          # Scene setup, animate loop, event handling
├── museum.js        # Room geometry, doors, keys, lighting
├── player.js        # Movement, PointerLockControls, collision
├── exhibits.js      # Clickable frames, raycasting, labels
├── gameState.js     # Centralized state for keys, doors, rooms
└── data.js          # Resume content
```

---

## Concept

The idea came from wanting to present a resume as something you experience rather than read. A static PDF communicates the same information but leaves no impression. This project forces the viewer to actively engage - finding keys, unlocking rooms, clicking through exhibits - which mirrors how I approach problems: deliberately and with attention to detail.

---

## Author

**Haneesh Tedla**
[LinkedIn](https://www.linkedin.com/in/haneesh-tedla-991b9a249) · [GitHub](https://github.com/TedlaHaneesh) · haneeshtedla@gmail.com
