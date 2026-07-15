# Cozy Space

A small Godot 4 third-person place to relax: indoor corner + outdoor garden in one continuous World. MVP is atmosphere + matcha at the tea station.

## Design

- Spec: `designs/cozy-space-matcha.md`
- Plan: `docs/superpowers/plans/2026-07-15-cozy-space-matcha.md`

## Assets

Kenney ecosystem only (CC0 / kit licenses):

- [Starter Kit Basic Scene](https://github.com/KenneyNL/Starter-Kit-Basic-Scene) (Mini Arena modules)
- Furniture Kit, Nature Kit, Food Kit
- Character from Kenney Starter Kit 3D Platformer

## Controls

| Action | Default |
|--------|---------|
| Move | WASD / arrows |
| Look | Mouse |
| Interact / hold | E |
| Release mouse | Esc |

## Run

1. Open this folder in **Godot 4.3+** (tested with 4.7).
2. Let assets import.
3. Play `scenes/world/world.tscn` (main scene).

```bash
godot --path . 
```

## License

- Code: see repository root
- Kenney assets: CC0 / as included in each pack (`License.txt` inside pack folders)
