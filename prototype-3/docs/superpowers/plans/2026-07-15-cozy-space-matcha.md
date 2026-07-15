# Cozy Space + Matcha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Godot 4 third-person cozy space (indoor + outdoor in one World) using Kenney assets only, then a no-fail matcha minigame at a tea station (progress retained; whisk = hold interact).

**Architecture:** Single continuous `World` scene with Indoor/Outdoor zones. `Player` focuses nearby interactables; each interactable owns state. Tea station is a multi-step state machine with hold-to-whisk. Placeholders for plants/radio/kitten.

**Tech Stack:** Godot 4.3+, GDScript, Kenney Starter-Kit-Basic-Scene + other Kenney CC0 packs only.

**Design doc:** `designs/cozy-space-matcha.md`

## Global Constraints

- Assets: **Kenney ecosystem only** (no non-Kenney meshes for props/characters).
- No fail states, no punishing timers.
- Matcha progress **retained** when player leaves the area.
- Whisk step: **hold** interact action until progress fills; release pauses.
- Interaction prompts: world-space **Label3D** only for MVP.
- One World scene; indoor and outdoor are sibling zones under `Level`, not separate packed levels.
- Every Godot system task must load the listed `godot-prompter:*` skill(s) before implementing.

---

## File map

| Path | Responsibility |
|------|----------------|
| `project.godot` | Main scene, input map, display |
| `scenes/world/world.tscn` | Level + interactables + player spawn |
| `scenes/player/player.tscn` + `player.gd` | Move, camera, focus, interact/hold |
| `scenes/interactables/interactable.gd` | Shared API base class |
| `scenes/interactables/tea_station.tscn` + `tea_station.gd` | Matcha steps + hold whisk |
| `scenes/interactables/placeholder_interactable.tscn` | Non-functional or “coming soon” spots |
| `assets/` | Imported Kenney packs (kit + extras) |
| `CLAUDE.md` | GodotPrompter integration (already / inject if missing) |

---

### Task 1: Bootstrap project from Kenney Starter Kit

**Skills:** `godot-prompter:godot-project-setup`, `godot-prompter:assets-pipeline`

**Files:**
- Create/populate: project root from kit clone
- Create: `CLAUDE.md` (GodotPrompter section if missing)
- Create: `assets/kenney/` layout notes in README fragment if needed

- [ ] **Step 1: Clone starter kit into the repo workspace**

```bash
cd /Users/amikai/Workspace/0714_hackathon/cmoney-aws-summit-hackathon/prototype-3
# If directory only has docs/designs, merge kit files into root:
git clone --depth 1 https://github.com/KenneyNL/Starter-Kit-Basic-Scene.git /tmp/kenney-basic-scene
cp -R /tmp/kenney-basic-scene/* /tmp/kenney-basic-scene/.[!.]* . 2>/dev/null || cp -R /tmp/kenney-basic-scene/* .
# Keep existing designs/ and docs/ — do not overwrite them
```

- [ ] **Step 2: Open in Godot 4.3+ and confirm the sample scene runs**

Run: open `project.godot` in Godot → Play  
Expected: Mini Arena sample loads without errors.

- [ ] **Step 3: Ensure `CLAUDE.md` has GodotPrompter section**

If missing, append:

```markdown
## GodotPrompter

This is a Godot project with GodotPrompter skills available. Before implementing any game system, you MUST check for a matching `godot-prompter:*` skill and invoke it. This applies to all agents, subagents, and sessions working in this repository.

Key skills: `player-controller`, `state-machine`, `event-bus`, `scene-organization`, `component-system`, `resource-pattern`, `godot-ui`, `hud-system`, `ai-navigation`, `camera-system`, `audio-system`, `save-load`, `inventory-system`, `godot-testing`.

For the full skill list, invoke `godot-prompter:using-godot-prompter`.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: bootstrap from Kenney Starter-Kit-Basic-Scene"
```

---

### Task 2: World layout — Indoor + Outdoor zones

**Skills:** `godot-prompter:scene-organization`, `godot-prompter:3d-essentials`, `godot-prompter:assets-pipeline`

**Files:**
- Create: `scenes/world/world.tscn`
- Modify: `project.godot` main scene → `res://scenes/world/world.tscn`
- Use: Kenney Mini Arena modules + download Kenney **Furniture Kit** / **Nature Kit** into `assets/kenney/` as needed (CC0, same style)

- [ ] **Step 1: Create empty World hierarchy**

In Godot, create `scenes/world/world.tscn` root `Node3D` named `World` with children:

```
World
├── Environment (Node3D)
├── Level (Node3D)
│   ├── Indoor
│   ├── Threshold
│   └── Outdoor
├── Interactables (Node3D)
├── Characters (Node3D)
└── Audio (Node3D)
```

- [ ] **Step 2: Build a small indoor corner + outdoor garden using only Kenney meshes**

Requirements:
- Walkable floor both zones; wall opening or doorframe at Threshold so player walks between them without loading.
- Indoor: warm fill light; Outdoor: sun + slightly cooler ambient.
- Footprint small (roughly one “room” + one “balcony/garden”), not an arena.

- [ ] **Step 3: Soften starter-kit “arena” look**

Tune `WorldEnvironment` (ambient, tonemap, glow lightly) and light colors toward cozy (warm indoor ~4000–4500K feel via color, soft shadows).

- [ ] **Step 4: Add Ambience `AudioStreamPlayer` under Audio**

Use a soft loop if available in packs; otherwise leave empty stream with TODO comment in editor description — do not add non-Kenney audio.

- [ ] **Step 5: Set as main scene and run**

Expected: Camera or current default shows connected indoor/outdoor; no script errors.

- [ ] **Step 6: Commit**

```bash
git add scenes/world project.godot assets
git commit -m "feat: cozy World with indoor and outdoor zones"
```

---

### Task 3: Third-person Player

**Skills:** `godot-prompter:player-controller`, `godot-prompter:input-handling`, `godot-prompter:camera-system`

**Files:**
- Create: `scenes/player/player.tscn`, `scenes/player/player.gd`
- Modify: `scenes/world/world.tscn` — instance Player under `Characters`
- Modify: `project.godot` input map

- [ ] **Step 1: Add input actions**

In Project Settings → Input Map:

| Action | Keys |
|--------|------|
| `move_left` | A / Left |
| `move_right` | D / Right |
| `move_forward` | W / Up |
| `move_back` | S / Down |
| `interact` | E |

- [ ] **Step 2: Build Player scene**

```
Player (CharacterBody3D)  script: player.gd
├── Model (Node3D)           # Kenney character mesh instance
├── CollisionShape3D         # Capsule
└── SpringArm3D              # spring_length ~4, collision mask world
    └── Camera3D
```

- [ ] **Step 3: Implement movement + camera follow**

```gdscript
# scenes/player/player.gd
extends CharacterBody3D

@export var move_speed: float = 4.0
@export var turn_speed: float = 10.0
@export var mouse_sensitivity: float = 0.003

@onready var spring_arm: SpringArm3D = $SpringArm3D

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		spring_arm.rotate_y(-event.relative.x * mouse_sensitivity)
		spring_arm.rotation.x = clampf(
			spring_arm.rotation.x - event.relative.y * mouse_sensitivity,
			deg_to_rad(-45.0),
			deg_to_rad(20.0)
		)
	if event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = (
			Input.MOUSE_MODE_VISIBLE
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
			else Input.MOUSE_MODE_CAPTURED
		)

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var cam_basis := spring_arm.global_transform.basis
	var forward := -cam_basis.z
	var right := cam_basis.x
	forward.y = 0.0
	right.y = 0.0
	forward = forward.normalized()
	right = right.normalized()
	var direction := (forward * -input_dir.y + right * input_dir.x).normalized()

	if direction != Vector3.ZERO:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed
		var target_yaw := atan2(direction.x, direction.z)
		rotation.y = lerp_angle(rotation.y, target_yaw, turn_speed * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, move_speed)
		velocity.z = move_toward(velocity.z, 0.0, move_speed)

	move_and_slide()
```

- [ ] **Step 4: Instance Player in World at Indoor spawn; playtest walk both zones**

Expected: Smooth third-person move; can cross Threshold without falling through; collision on walls.

- [ ] **Step 5: Commit**

```bash
git add scenes/player scenes/world project.godot
git commit -m "feat: third-person player with spring-arm camera"
```

---

### Task 4: Interactable base + Player focus / hold input

**Skills:** `godot-prompter:component-system`, `godot-prompter:input-handling`

**Files:**
- Create: `scenes/interactables/interactable.gd`
- Modify: `scenes/player/player.gd`

- [ ] **Step 1: Create base class**

```gdscript
# scenes/interactables/interactable.gd
class_name Interactable
extends StaticBody3D

signal prompt_changed(text: String)

@export var interaction_area_path: NodePath = NodePath("InteractionArea")
@export var prompt_label_path: NodePath = NodePath("Prompt")

var _player_inside: bool = false

@onready var _area: Area3D = get_node(interaction_area_path)
@onready var _prompt: Label3D = get_node(prompt_label_path)

func _ready() -> void:
	_area.body_entered.connect(_on_body_entered)
	_area.body_exited.connect(_on_body_exited)
	_prompt.visible = false
	_refresh_prompt()

func can_interact() -> bool:
	return true

func is_hold_interact() -> bool:
	return false

func try_interact() -> void:
	pass

func begins_hold_interact() -> void:
	pass

func ends_hold_interact() -> void:
	pass

func get_prompt_text() -> String:
	return "按 E 互動"

func _refresh_prompt() -> void:
	_prompt.text = get_prompt_text()
	prompt_changed.emit(_prompt.text)

func set_focused(focused: bool) -> void:
	_prompt.visible = focused and _player_inside
	if focused:
		_refresh_prompt()

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_inside = true
		if body.has_method("register_interactable"):
			body.register_interactable(self)

func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_inside = false
		if body.has_method("unregister_interactable"):
			body.unregister_interactable(self)
		_prompt.visible = false
```

- [ ] **Step 2: Extend Player with focus list + interact / hold**

Add to `player.gd` (merge with existing code):

```gdscript
var _nearby: Array[Interactable] = []
var _focused: Interactable = null
var _holding: bool = false

func _ready() -> void:
	add_to_group("player")
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func register_interactable(interactable: Interactable) -> void:
	if interactable not in _nearby:
		_nearby.append(interactable)
	_update_focus()

func unregister_interactable(interactable: Interactable) -> void:
	_nearby.erase(interactable)
	if _focused == interactable:
		if _holding:
			_focused.ends_hold_interact()
			_holding = false
		_focused = null
	_update_focus()

func _update_focus() -> void:
	var best: Interactable = null
	var best_dist := INF
	for i in _nearby:
		if i == null or not is_instance_valid(i):
			continue
		if not i.can_interact():
			continue
		var d := global_position.distance_squared_to(i.global_position)
		if d < best_dist:
			best_dist = d
			best = i
	if _focused != best:
		if _focused:
			_focused.set_focused(false)
			if _holding:
				_focused.ends_hold_interact()
				_holding = false
		_focused = best
		if _focused:
			_focused.set_focused(true)

func _physics_process(delta: float) -> void:
	# ... existing movement ...
	_update_focus()
	if _focused and _holding and _focused.is_hold_interact():
		# hold is edge-driven; whisk progress advances inside interactable via _process
		pass

func _unhandled_input(event: InputEvent) -> void:
	# ... existing mouse look ...
	if _focused == null:
		return
	if event.is_action_pressed("interact"):
		if _focused.is_hold_interact():
			_holding = true
			_focused.begins_hold_interact()
		else:
			_focused.try_interact()
			_focused.set_focused(true)  # refresh prompt
	elif event.is_action_released("interact") and _holding:
		_holding = false
		if _focused:
			_focused.ends_hold_interact()
			_focused.set_focused(true)
```

- [ ] **Step 3: Smoke-test with a temporary cube Interactable in World**

Expected: Enter area → nearest Label3D shows; E calls `try_interact`; leave → prompt hides.

- [ ] **Step 4: Commit**

```bash
git add scenes/interactables scenes/player
git commit -m "feat: interactable focus API with hold support"
```

---

### Task 5: Tea station — matcha flow

**Skills:** `godot-prompter:state-machine`, `godot-prompter:component-system`, `godot-prompter:audio-system`

**Files:**
- Create: `scenes/interactables/tea_station.tscn`, `scenes/interactables/tea_station.gd`
- Modify: `scenes/world/world.tscn` — place under `Interactables`
- Kenney: table + bowl-like props from Furniture/Food kits

**Interfaces:**
- Consumes: `Interactable` API from Task 4
- Produces: `signal matcha_completed`, retained `step` + `whisk_progress`

- [ ] **Step 1: Build tea_station scene**

```
TeaStation (StaticBody3D)  script: tea_station.gd  (extends Interactable)
├── MeshHost (Node3D)          # Kenney furniture + bowl props
├── CollisionShape3D
├── InteractionArea (Area3D)
│   └── CollisionShape3D       # slightly larger than table
└── Prompt (Label3D)           # billboard, above table
```

- [ ] **Step 2: Implement matcha state machine**

```gdscript
# scenes/interactables/tea_station.gd
extends Interactable

signal matcha_completed
signal step_changed(step: StringName)

enum Step { IDLE, PREPARE, WHISK, SERVE, DONE }

@export var whisk_hold_seconds: float = 2.5

var step: Step = Step.IDLE
var whisk_progress: float = 0.0
var _holding_whisk: bool = false

func can_interact() -> bool:
	return step != Step.DONE  # or true if allow re-brew later

func is_hold_interact() -> bool:
	return step == Step.WHISK

func get_prompt_text() -> String:
	match step:
		Step.IDLE:
			return "按 E 開始泡抹茶"
		Step.PREPARE:
			return "按 E 準備茶具"
		Step.WHISK:
			return "按住 E 刷茶  %d%%" % int(whisk_progress * 100.0)
		Step.SERVE:
			return "按 E 盛茶"
		Step.DONE:
			return "抹茶好了"
	return ""

func try_interact() -> void:
	match step:
		Step.IDLE:
			_set_step(Step.PREPARE)
		Step.PREPARE:
			_set_step(Step.WHISK)
			whisk_progress = 0.0
		Step.SERVE:
			_set_step(Step.DONE)
			matcha_completed.emit()
		_:
			pass

func begins_hold_interact() -> void:
	if step == Step.WHISK:
		_holding_whisk = true

func ends_hold_interact() -> void:
	_holding_whisk = false
	# progress retained by design

func _process(delta: float) -> void:
	if step != Step.WHISK or not _holding_whisk:
		return
	whisk_progress = clampf(whisk_progress + delta / whisk_hold_seconds, 0.0, 1.0)
	_refresh_prompt()
	if whisk_progress >= 1.0:
		_holding_whisk = false
		_set_step(Step.SERVE)

func _set_step(next: Step) -> void:
	step = next
	step_changed.emit(StringName(Step.keys()[step]))
	_refresh_prompt()
```

- [ ] **Step 3: Playtest checklist**

1. Approach → Label3D “開始泡抹茶”
2. E → prepare → E → whisk
3. Hold E → percent rises; release → percent stays
4. Walk away mid-whisk → prompt hides; return → same percent
5. Finish hold → serve → E → “抹茶好了” + `matcha_completed`

- [ ] **Step 4: Optional light SFX on step change** (Kenney UI/impact only if in packs)

- [ ] **Step 5: Commit**

```bash
git add scenes/interactables scenes/world
git commit -m "feat: tea station matcha flow with hold-to-whisk"
```

---

### Task 6: Placeholders + polish pass

**Skills:** `godot-prompter:scene-organization`, `godot-prompter:3d-essentials`, `godot-prompter:audio-system`

**Files:**
- Create: `scenes/interactables/placeholder_interactable.gd` (optional)
- Modify: `scenes/world/world.tscn`

- [ ] **Step 1: Place empty interactable markers**

Under `Interactables`: `PlantSpot_Indoor`, `PlantSpot_Outdoor`, `Radio`, `KittenBowl` — each with Area + Label3D text like `（之後）澆花`, disabled `can_interact() -> false` or soft message only.

- [ ] **Step 2: Atmosphere polish**

- Sit-able chair mesh near tea station (visual only OK for MVP)
- Outdoor nature scatter (Kenney Nature)
- Verify no non-Kenney assets slipped in

- [ ] **Step 3: Final playtest (5 minutes)**

Walk indoor ↔ outdoor, complete full matcha once, leave and resume mid-whisk once.

- [ ] **Step 4: Commit**

```bash
git add scenes assets
git commit -m "feat: activity placeholders and cozy polish"
```

---

## Verification (definition of done)

- [ ] Main scene is `world.tscn`; third-person walk works in both zones without scene change
- [ ] Only Kenney visual assets
- [ ] Matcha: tap steps + hold whisk; progress retained on leave
- [ ] Label3D prompts only for interaction
- [ ] Placeholders present for plants, radio, kitten
- [ ] `designs/cozy-space-matcha.md` still matches implementation

---

## Later (not this plan)

- Plant watering state
- Radio on/off + Kenney music tracks if any
- Kitten feed + simple idle animation
- Sit-to-drink after matcha (animation / camera ease)
- Save matcha/plant state across sessions
