extends Interactable

@export var placeholder_text: String = "（之後）"


func can_interact() -> bool:
	return true


func get_prompt_text() -> String:
	return placeholder_text


func try_interact() -> void:
	# Soft acknowledgement only — no fail, no progression yet
	_prompt.text = placeholder_text + " · 慢慢來"
