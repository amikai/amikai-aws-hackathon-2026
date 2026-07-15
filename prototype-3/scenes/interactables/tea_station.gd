extends Interactable

signal matcha_completed
signal step_changed(step: StringName)

enum Step { IDLE, PREPARE, WHISK, SERVE, DONE }

@export var whisk_hold_seconds: float = 2.5

var step: Step = Step.IDLE
var whisk_progress: float = 0.0
var _holding_whisk: bool = false


func can_interact() -> bool:
	return true


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
			return "抹茶好了 · 慢慢喝"
	return ""


func try_interact() -> void:
	match step:
		Step.IDLE:
			_set_step(Step.PREPARE)
		Step.PREPARE:
			whisk_progress = 0.0
			_set_step(Step.WHISK)
		Step.SERVE:
			_set_step(Step.DONE)
			matcha_completed.emit()
		Step.DONE:
			# Gentle re-brew, no fail
			whisk_progress = 0.0
			_set_step(Step.IDLE)
		_:
			pass


func begins_hold_interact() -> void:
	if step == Step.WHISK:
		_holding_whisk = true


func ends_hold_interact() -> void:
	_holding_whisk = false
	# Progress retained by design


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
	step_changed.emit(_step_name(step))
	_refresh_prompt()


func _step_name(s: Step) -> StringName:
	match s:
		Step.IDLE:
			return &"idle"
		Step.PREPARE:
			return &"prepare"
		Step.WHISK:
			return &"whisk"
		Step.SERVE:
			return &"serve"
		Step.DONE:
			return &"done"
	return &"unknown"
