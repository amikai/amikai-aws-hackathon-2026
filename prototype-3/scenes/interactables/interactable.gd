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
	_prompt.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_prompt.no_depth_test = true
	_prompt.font_size = 48
	_prompt.modulate = Color(1.0, 0.98, 0.9)
	_prompt.outline_size = 8
	_prompt.outline_modulate = Color(0.15, 0.12, 0.1, 0.9)
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
