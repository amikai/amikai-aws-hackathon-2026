# Cozy Space + Matcha — Design

> Brainstorming outcome (godot-brainstorming). MVP: space first, then matcha.

## Product

| Item | Decision |
|------|----------|
| Feel | Small place to relax; no pressure, no fail states |
| Activities (roadmap) | Plants, matcha, radio, feed kitten |
| MVP | (1) Walkable indoor + outdoor space (2) Matcha at tea station |
| Perspective | Third-person |
| Space | Single `World` scene, Indoor + Outdoor zones connected |
| Assets | Kenney ecosystem only (Starter-Kit-Basic-Scene / Mini Arena + other Kenney CC0 packs) |
| Interaction prompt | World-space `Label3D` |
| Matcha progress | Retained when player walks away |
| Whisk step | Hold interact (not tap) |

## Architecture

**Approach A:** One continuous scene + shared Interactable pattern.

- `Player` owns movement, camera, and which interactable is focused.
- Each interactable owns its own state machine and prompt text.
- No EventBus for MVP; signals up, method calls down.

## Scene tree

```
World (Node3D)
├── Environment
│   ├── WorldEnvironment
│   ├── Sun (DirectionalLight3D)
│   └── FillLights (Node3D)
├── Level (Node3D)
│   ├── Indoor (Node3D)
│   │   ├── Structure
│   │   ├── Furniture
│   │   └── Decor
│   ├── Threshold (Node3D)
│   └── Outdoor (Node3D)
│       ├── Structure
│       ├── GardenBeds
│       └── Nature
├── Interactables (Node3D)
│   ├── TeaStation (StaticBody3D)     # MVP
│   ├── PlantSpot_Indoor              # placeholder
│   ├── PlantSpot_Outdoor             # placeholder
│   ├── Radio                         # placeholder
│   └── KittenBowl                    # placeholder
├── Characters (Node3D)
│   ├── Player (CharacterBody3D)
│   │   ├── Model
│   │   ├── CollisionShape3D
│   │   └── SpringArm3D / Camera3D
│   └── Kitten                        # placeholder
├── Audio (Node3D)
│   └── Ambience (AudioStreamPlayer)
└── UI (CanvasLayer)                  # minimal; prompts are Label3D
```

### Reusable scenes

| Scene | Responsibility |
|-------|----------------|
| `scenes/player/player.tscn` | Third-person move + camera + focus interactable |
| `scenes/interactables/interactable_base.tscn` | Area3D + Label3D + shared API |
| `scenes/interactables/tea_station.tscn` | Matcha multi-step flow |
| `scenes/world/world.tscn` | Level assembly + main scene |

## Interactable API

```gdscript
func can_interact() -> bool
func try_interact() -> void
func get_prompt_text() -> String
# Hold support (matcha whisk):
func begins_hold_interact() -> void
func ends_hold_interact() -> void
func is_hold_interact() -> bool
```

## Matcha state machine

| Step | Id | Input | Notes |
|------|-----|-------|-------|
| 0 | `idle` | Tap E | Start prepare |
| 1 | `prepare` | Tap E | Advance to whisk |
| 2 | `whisk` | **Hold E** until progress full | No fail; release pauses progress |
| 3 | `serve` | Tap E | Finish |
| 4 | `done` | — | Prompt shows ready; optional re-brew later |

- Leave area: hide `Label3D`, **keep** step + whisk progress.
- Re-enter: show prompt for current step.

## Signals

| Signal | From | To | Purpose |
|--------|------|-----|---------|
| `body_entered` / `body_exited` | InteractionArea | Interactable | Prompt visibility |
| `matcha_completed` | TeaStation | World (optional SFX) | Ceremony finished |
| `step_changed(step: StringName)` | TeaStation | self / debug | Step transitions |

## Data ownership

| Data | Owner |
|------|-------|
| Position, velocity, focused interactable | Player |
| Matcha step, whisk progress (0..1) | TeaStation |
| Prompt string | Each Interactable |

## Asset rules

1. Start from [KenneyNL/Starter-Kit-Basic-Scene](https://github.com/KenneyNL/Starter-Kit-Basic-Scene).
2. Expand only with other Kenney CC0 packs (Furniture, Nature, Food, Characters, Animals as needed).
3. Prefer composing existing meshes over custom modeling.
4. Relaxation feel comes from lighting, environment, audio — not a different art style.

## Out of scope (MVP)

- Plant care, radio, kitten behavior (placeholders only)
- Save/load across sessions
- Fail states, timers that punish the player
- Multiplayer, combat, economy
