extends SceneTree

## Headless smoke test for tea station state machine.
## Run: godot --headless --path . -s res://scripts/tests/test_matcha_flow.gd


func _init() -> void:
	var ok := true
	var station_script: Script = load("res://scenes/interactables/tea_station.gd")
	var root := StaticBody3D.new()
	root.set_script(station_script)

	# Minimal nodes Interactable expects
	var area := Area3D.new()
	area.name = "InteractionArea"
	root.add_child(area)
	var prompt := Label3D.new()
	prompt.name = "Prompt"
	root.add_child(prompt)

	root._ready()

	if root.step != root.Step.IDLE:
		push_error("Expected IDLE")
		ok = false

	root.try_interact()
	if root.step != root.Step.PREPARE:
		push_error("Expected PREPARE after first tap")
		ok = false

	root.try_interact()
	if root.step != root.Step.WHISK:
		push_error("Expected WHISK")
		ok = false
	if not root.is_hold_interact():
		push_error("WHISK should be hold")
		ok = false

	root.begins_hold_interact()
	root._process(root.whisk_hold_seconds)
	if root.step != root.Step.SERVE:
		push_error("Expected SERVE after full hold")
		ok = false

	# Simulate leave mid-whisk retention on a fresh run
	var root2 := StaticBody3D.new()
	root2.set_script(station_script)
	var area2 := Area3D.new()
	area2.name = "InteractionArea"
	root2.add_child(area2)
	var prompt2 := Label3D.new()
	prompt2.name = "Prompt"
	root2.add_child(prompt2)
	root2._ready()
	root2.try_interact()
	root2.try_interact()
	root2.begins_hold_interact()
	root2._process(root2.whisk_hold_seconds * 0.4)
	root2.ends_hold_interact()
	var mid: float = root2.whisk_progress
	if mid < 0.3 or mid > 0.5:
		push_error("Expected ~40%% whisk progress, got %s" % mid)
		ok = false
	root2.begins_hold_interact()
	root2._process(root2.whisk_hold_seconds * 0.7)
	if root2.step != root2.Step.SERVE:
		push_error("Progress should resume to SERVE")
		ok = false

	if ok:
		print("TEST PASS: matcha flow")
		quit(0)
	else:
		print("TEST FAIL: matcha flow")
		quit(1)
