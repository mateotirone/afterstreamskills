---
name: highlight-finder
description: Find every clip-worthy moment in a stream recording or transcript. Use when a streamer wants a ranked list of highlights with timestamps from a VOD, OBS recording, or transcript.
---

# Highlight finder

Turn a full stream into a ranked list of every moment worth clipping, not just the loudest five.

## Inputs
- A transcript with timestamps (from Whisper or the platform), and if available: chat log, audio loudness peaks, game events (kills, overtakes, round wins, crashes).

## Steps
1. Split the stream into 20 to 90 second candidate windows around any signal: chat spikes, loudness peaks, laughter, swearing, game events, or a strong line in the transcript.
2. For each window, write one line on what happens and why someone would watch it.
3. Score each window 1 to 10 on four things: hook strength (first 2 seconds), payoff, standalone clarity (makes sense with no context), and emotion.
4. Tag each one: funny, clutch, fail, rage, wholesome, educational, hot take, story.
5. Merge overlapping windows and keep the best boundaries.
6. Keep going past the obvious ones. A 4 hour stream should give 25 to 60 candidates. Mid-score clips are still good for Shorts volume.

## Output
A table: rank, start, end, score, tags, one-line summary, suggested hook line. Then a short note on which 3 are YouTube-video material and which are Shorts.

---
Part of the Afterstream skills pack. https://useafterstream.com
