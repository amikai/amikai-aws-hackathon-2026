extends CharacterBody3D

@export var move_speed: float = 4.0
@export var turn_speed: float = 10.0
@export var mouse_sensitivity: float = 0.003

@onready var spring_arm: SpringArm3D = $SpringArm3D
@onready var model: Node3D = $Model

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

var _nearby: Array[Interactable] = []
var _focused: Interactable = null
var _holding: bool = false


func _ready() -> void:
	add_to_group("player")
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	spring_arm.add_excluded_object(get_rid())


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
		_focused.set_focused(false)
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
	if _focused == best:
		return
	if _focused:
		_focused.set_focused(false)
		if _holding:
			_focused.ends_hold_interact()
			_holding = false
	_focused = best
	if _focused:
		_focused.set_focused(true)


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

	if _focused == null:
		return
	if event.is_action_pressed("interact"):
		if _focused.is_hold_interact():
			_holding = true
			_focused.begins_hold_interact()
		else:
			_focused.try_interact()
			_focused.set_focused(true)
	elif event.is_action_released("interact") and _holding:
		_holding = false
		if _focused:
			_focused.ends_hold_interact()
			_focused.set_focused(true)


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
	var direction := (forward * -input_dir.y + right * input_dir.x)
	if direction.length_squared() > 0.0001:
		direction = direction.normalized()

	if direction != Vector3.ZERO:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed
		var target_yaw := atan2(direction.x, direction.z)
		model.rotation.y = lerp_angle(model.rotation.y, target_yaw, turn_speed * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, move_speed)
		velocity.z = move_toward(velocity.z, 0.0, move_speed)

	move_and_slide()
	_update_focus()
