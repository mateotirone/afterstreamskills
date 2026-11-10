# Afterstream skills

Free Claude skills built from the same tools that run Afterstream. Each folder is one skill you can drop into Claude.

| Skill | What it does |
|---|---|
| [highlight-finder](highlight-finder/SKILL.md) | Find every clip-worthy moment in a stream recording or transcript. |
| [hook-first-editor](hook-first-editor/SKILL.md) | Re-cut a clip so the best moment is the first thing viewers see. |
| [caption-writer](caption-writer/SKILL.md) | Write post captions, titles, and hashtags in the creator's own voice. |
| [voice-profile-builder](voice-profile-builder/SKILL.md) | Build a voice.md file that captures how a creator talks and writes. |
| [hashtag-scout](hashtag-scout/SKILL.md) | Research hashtags for a clip based on the game, content type, and audience. |
| [content-planner](content-planner/SKILL.md) | Build a weekly or monthly content plan for a streamer. |
| [algorithm-watcher](algorithm-watcher/SKILL.md) | Summarize how each platform's algorithm currently ranks short and long videos, and what that means for a creator. |
| [youtube-packager](youtube-packager/SKILL.md) | Write YouTube titles, thumbnail concepts, chapters, and descriptions for a stream highlights video. |
| [comment-replier](comment-replier/SKILL.md) | Draft replies to comments in the creator's voice and flag the ones that need a human. |
| [glass-light-backgrounds](glass-light-backgrounds/SKILL.md) | Add fluted glass, lens distortion, iridescent shapes, thermal gradient, water ripple and blurred photo backgrounds, in light and dark. |
| [less-generic-ui](less-generic-ui/SKILL.md) | Design or review a web page so it doesn't look AI-made: layout, motion and density dials, copy checker, light and dark. |

## Install

**Claude.ai or the Claude app:** download a skill zip from the releases page (or run `scripts/build-skills.sh`), then go to Settings, Capabilities, Skills, and upload the zip.

**Claude Code:** copy a skill folder into `~/.claude/skills/` (for all projects) or `.claude/skills/` in a project.

Start with `voice-profile-builder`. The caption and reply skills read the `voice.md` it creates.

Want all of this to run on its own after every stream? That's Afterstream: https://useafterstream.com
