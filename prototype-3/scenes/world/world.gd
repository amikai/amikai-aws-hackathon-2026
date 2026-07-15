extends Node3D

## Assembles a cozy indoor corner + outdoor garden from Kenney packs only.

const FURN := "res://assets/kenney/furniture-kit/Models/GLTF format/"
const NATURE := "res://assets/kenney/nature-kit/Models/GLTF format/"
const FOOD := "res://assets/kenney/food-kit/Models/GLB format/"
const MINI := "res://sample/Mini Arena/Models/GLB format/"
const CHAR := "res://assets/kenney/characters/character.glb"

@onready var level: Node3D = $Level
@onready var interactables: Node3D = $Interactables
@onready var characters: Node3D = $Characters


func _ready() -> void:
	_build_collision_floors()
	_build_indoor()
	_build_threshold()
	_build_outdoor()
	_spawn_player()
	_spawn_tea_station()
	_spawn_placeholders()
	print("[World] Cozy space ready — walk indoor ↔ outdoor, find the tea table.")


func _instance_mesh(path: String, parent: Node3D, pos: Vector3, rot_y: float = 0.0, scale_factor: float = 1.0) -> Node3D:
	if not ResourceLoader.exists(path):
		push_warning("Missing asset: %s" % path)
		return null
	var packed: PackedScene = load(path)
	var node: Node3D = packed.instantiate() as Node3D
	parent.add_child(node)
	node.position = pos
	node.rotation.y = rot_y
	if scale_factor != 1.0:
		node.scale = Vector3.ONE * scale_factor
	return node


func _add_box_body(parent: Node3D, size: Vector3, pos: Vector3) -> void:
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	body.position = pos
	body.add_child(shape)
	parent.add_child(body)


func _build_collision_floors() -> void:
	var coll := level.get_node("Collision") as Node3D
	# Indoor floor: x -3..3, z -4..1
	_add_box_body(coll, Vector3(6.2, 0.2, 5.2), Vector3(0, -0.1, -1.5))
	# Threshold
	_add_box_body(coll, Vector3(2.2, 0.2, 1.5), Vector3(0, -0.1, 1.5))
	# Outdoor floor: x -4..4, z 2..8
	_add_box_body(coll, Vector3(8.2, 0.2, 6.2), Vector3(0, -0.1, 5.0))
	# Indoor walls (thin boxes)
	_add_box_body(coll, Vector3(6.2, 2.5, 0.2), Vector3(0, 1.2, -4.1)) # back
	_add_box_body(coll, Vector3(0.2, 2.5, 5.2), Vector3(-3.1, 1.2, -1.5)) # left
	_add_box_body(coll, Vector3(0.2, 2.5, 5.2), Vector3(3.1, 1.2, -1.5)) # right
	# Outdoor low fence
	_add_box_body(coll, Vector3(8.2, 0.8, 0.15), Vector3(0, 0.4, 8.1))
	_add_box_body(coll, Vector3(0.15, 0.8, 6.2), Vector3(-4.1, 0.4, 5.0))
	_add_box_body(coll, Vector3(0.15, 0.8, 6.2), Vector3(4.1, 0.4, 5.0))


func _build_indoor() -> void:
	var indoor: Node3D = level.get_node("Indoor")
	var structure: Node3D = indoor.get_node("Structure")
	var furniture: Node3D = indoor.get_node("Furniture")
	var decor: Node3D = indoor.get_node("Decor")

	# Floor tiles (furniture kit modular ~1m)
	for x in range(-3, 3):
		for z in range(-4, 1):
			_instance_mesh(FURN + "floorFull.glb", structure, Vector3(x + 0.5, 0.0, z + 0.5))

	# Walls along back and sides (visual)
	for x in range(-3, 3):
		_instance_mesh(FURN + "wall.glb", structure, Vector3(x + 0.5, 0.0, -4.0), 0.0)
	for z in range(-4, 1):
		_instance_mesh(FURN + "wall.glb", structure, Vector3(-3.0, 0.0, z + 0.5), deg_to_rad(90))
		_instance_mesh(FURN + "wall.glb", structure, Vector3(3.0, 0.0, z + 0.5), deg_to_rad(-90))

	# Cozy furniture
	_instance_mesh(FURN + "loungeSofa.glb", furniture, Vector3(-1.6, 0.0, -2.8), deg_to_rad(20))
	_instance_mesh(FURN + "loungeChairRelax.glb", furniture, Vector3(1.8, 0.0, -2.5), deg_to_rad(-30))
	_instance_mesh(FURN + "bookcaseOpen.glb", furniture, Vector3(-2.4, 0.0, -3.6), 0.0)
	_instance_mesh(FURN + "lampRoundFloor.glb", furniture, Vector3(2.4, 0.0, -3.5), 0.0)
	_instance_mesh(FURN + "rugRectangle.glb", furniture, Vector3(0.0, 0.01, -2.0), 0.0)
	_instance_mesh(FURN + "sideTable.glb", furniture, Vector3(0.9, 0.0, -3.2), 0.0)
	_instance_mesh(FURN + "pottedPlant.glb", decor, Vector3(-2.5, 0.0, -1.2), 0.0)
	_instance_mesh(FURN + "plantSmall1.glb", decor, Vector3(2.5, 0.0, -1.0), 0.0)


func _build_threshold() -> void:
	var thr: Node3D = level.get_node("Threshold")
	_instance_mesh(FURN + "doorwayOpen.glb", thr, Vector3(0.0, 0.0, 1.0), 0.0)
	_instance_mesh(FURN + "rugDoormat.glb", thr, Vector3(0.0, 0.02, 1.2), 0.0)
	# Floor strip
	for x in range(-1, 1):
		_instance_mesh(FURN + "floorFull.glb", thr, Vector3(x + 0.5, 0.0, 1.0))


func _build_outdoor() -> void:
	var outdoor: Node3D = level.get_node("Outdoor")
	var structure: Node3D = outdoor.get_node("Structure")
	var garden: Node3D = outdoor.get_node("GardenBeds")
	var nature: Node3D = outdoor.get_node("Nature")

	# Grass ground tiles (nature kit)
	for x in range(-4, 4):
		for z in range(2, 8):
			_instance_mesh(NATURE + "ground_grass.glb", structure, Vector3(x + 0.5, 0.0, z + 0.5))

	# Path from door into garden
	for z in range(2, 6):
		_instance_mesh(NATURE + "ground_pathStraight.glb", structure, Vector3(0.0, 0.01, z + 0.5))

	# Fences
	for x in range(-4, 4):
		_instance_mesh(NATURE + "fence_simpleLow.glb", structure, Vector3(x + 0.5, 0.0, 8.0), 0.0)
	for z in range(2, 8):
		_instance_mesh(NATURE + "fence_simpleLow.glb", structure, Vector3(-4.0, 0.0, z + 0.5), deg_to_rad(90))
		_instance_mesh(NATURE + "fence_simpleLow.glb", structure, Vector3(4.0, 0.0, z + 0.5), deg_to_rad(90))

	# Garden beds + flowers
	_instance_mesh(NATURE + "crops_dirtDoubleRow.glb", garden, Vector3(-2.2, 0.0, 5.5), 0.0)
	_instance_mesh(NATURE + "crops_dirtDoubleRow.glb", garden, Vector3(2.2, 0.0, 5.5), 0.0)
	_instance_mesh(NATURE + "flower_purpleA.glb", nature, Vector3(-2.0, 0.0, 5.2), 0.0)
	_instance_mesh(NATURE + "flower_yellowB.glb", nature, Vector3(-2.4, 0.0, 5.8), 0.0)
	_instance_mesh(NATURE + "flower_redA.glb", nature, Vector3(2.0, 0.0, 5.3), 0.0)
	_instance_mesh(NATURE + "flower_purpleC.glb", nature, Vector3(2.5, 0.0, 5.7), 0.0)
	_instance_mesh(NATURE + "grass.glb", nature, Vector3(-3.2, 0.0, 6.5), 0.0)
	_instance_mesh(NATURE + "grass_large.glb", nature, Vector3(3.0, 0.0, 7.0), 0.0)

	# Trees from Mini Arena (same Kenney style family)
	_instance_mesh(MINI + "tree.glb", nature, Vector3(-3.2, 0.0, 7.2), 0.0, 0.9)
	_instance_mesh(MINI + "tree.glb", nature, Vector3(3.3, 0.0, 7.0), deg_to_rad(40), 0.75)

	# Bench
	_instance_mesh(FURN + "benchCushion.glb", outdoor, Vector3(0.0, 0.0, 6.8), deg_to_rad(180))


func _spawn_player() -> void:
	var player_scene: PackedScene = load("res://scenes/player/player.tscn")
	var player: Node3D = player_scene.instantiate()
	characters.add_child(player)
	player.position = Vector3(0.0, 0.1, -1.5)
	if ResourceLoader.exists(CHAR):
		var model_root: Node3D = player.get_node("Model")
		var char_scene: PackedScene = load(CHAR)
		var char_node: Node3D = char_scene.instantiate() as Node3D
		model_root.add_child(char_node)
		char_node.scale = Vector3.ONE * 0.85


func _make_interactable_shell(script: Script, name: String, pos: Vector3, prompt_height: float = 1.4) -> StaticBody3D:
	var root := StaticBody3D.new()
	root.name = name
	root.set_script(script)
	root.position = pos

	var mesh_host := Node3D.new()
	mesh_host.name = "MeshHost"
	root.add_child(mesh_host)

	var col := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(1.2, 1.0, 1.2)
	col.shape = box
	col.position = Vector3(0, 0.5, 0)
	root.add_child(col)

	var area := Area3D.new()
	area.name = "InteractionArea"
	area.monitoring = true
	area.monitorable = false
	var area_col := CollisionShape3D.new()
	var area_box := BoxShape3D.new()
	area_box.size = Vector3(2.4, 2.0, 2.4)
	area_col.shape = area_box
	area_col.position = Vector3(0, 0.8, 0)
	area.add_child(area_col)
	root.add_child(area)

	var prompt := Label3D.new()
	prompt.name = "Prompt"
	prompt.position = Vector3(0, prompt_height, 0)
	root.add_child(prompt)

	# Caller must interactables.add_child after configuring exports
	return root


func _spawn_tea_station() -> void:
	var script: Script = load("res://scenes/interactables/tea_station.gd")
	var station := _make_interactable_shell(script, "TeaStation", Vector3(1.2, 0.0, -1.0), 1.6)
	var host: Node3D = station.get_node("MeshHost")
	_instance_mesh(FURN + "tableCoffee.glb", host, Vector3.ZERO)
	_instance_mesh(FURN + "chair.glb", host, Vector3(0.0, 0.0, 0.7), deg_to_rad(180))
	_instance_mesh(FOOD + "bowl.glb", host, Vector3(0.1, 0.45, 0.05), 0.0, 0.5)
	_instance_mesh(FOOD + "cup-tea.glb", host, Vector3(-0.15, 0.45, -0.05), 0.0, 0.45)
	_instance_mesh(FOOD + "whisk.glb", host, Vector3(0.25, 0.48, -0.1), deg_to_rad(30), 0.4)
	interactables.add_child(station)
	if station.has_signal("matcha_completed"):
		station.matcha_completed.connect(_on_matcha_completed)


func _spawn_placeholders() -> void:
	var ph_script: Script = load("res://scenes/interactables/placeholder_interactable.gd")

	var plant_in := _make_interactable_shell(ph_script, "PlantSpot_Indoor", Vector3(-2.5, 0.0, -1.2), 1.3)
	plant_in.set("placeholder_text", "（之後）澆花")
	_instance_mesh(FURN + "plantSmall2.glb", plant_in.get_node("MeshHost"), Vector3(0.3, 0.0, 0.3))
	interactables.add_child(plant_in)

	var plant_out := _make_interactable_shell(ph_script, "PlantSpot_Outdoor", Vector3(-2.2, 0.0, 5.5), 1.2)
	plant_out.set("placeholder_text", "（之後）照顧花圃")
	interactables.add_child(plant_out)

	var radio := _make_interactable_shell(ph_script, "Radio", Vector3(0.9, 0.0, -3.2), 1.2)
	radio.set("placeholder_text", "（之後）開收音機")
	_instance_mesh(FURN + "radio.glb", radio.get_node("MeshHost"), Vector3(0, 0.45, 0), 0.0, 1.0)
	interactables.add_child(radio)

	var kitten := _make_interactable_shell(ph_script, "KittenBowl", Vector3(-1.0, 0.0, -0.5), 1.0)
	kitten.set("placeholder_text", "（之後）餵小貓")
	_instance_mesh(FOOD + "bowl.glb", kitten.get_node("MeshHost"), Vector3.ZERO, 0.0, 0.6)
	interactables.add_child(kitten)


func _on_matcha_completed() -> void:
	print("[World] Matcha ready. Sit, breathe, enjoy.")
