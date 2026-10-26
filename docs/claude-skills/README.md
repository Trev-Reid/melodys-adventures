# The melody-art-director Skill: switch it on

This folder holds the art-director Skill, updated on 2026-10-25. Claude Code only uses Skills
in `.claude/skills/`. Claude's remote tools aren't allowed to write there, because that folder
can hold settings that run commands. So it needs moving once, either by you or by Claude Code
running on this computer.

In PowerShell:

```powershell
cd D:\projects\melodys-adventures
New-Item -ItemType Directory -Force .claude\skills | Out-Null
Move-Item docs\claude-skills\melody-art-director .claude\skills\
Remove-Item docs\claude-skills -Recurse
```

Or in File Explorer: drag `melody-art-director` into `.claude\skills\`, then delete this
`claude-skills` folder.

You should end up with `.claude\skills\melody-art-director\SKILL.md`. Commit `.claude/skills/`
so the Skill travels with the project to GitHub, other computers, and Claude Code on the web.

**What it lets Claude run without asking.** In the turn where the Skill is used, it
pre-approves only these commands:

- `npm run art:check`
- `npm run review:capture`
- `npm run review:compare`
- `npm test`
- `npm run typecheck`

They check the pictures, run the tests and take screenshots into `art/review/out/`. None of
them changes the game's art or code. `npm run review:approve`, which replaces the approved
screenshots, still asks first.
