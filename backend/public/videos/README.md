# Preloaded Vehicle Scan Videos

This directory stores MP4 video guides demonstrating CUT and ISOLATION zones for first responders.

## Video Naming Convention
All video files must match the vehicle's unique ID in lowercase format:
`{make}-{model}-{year}.mp4`

Examples:
- `toyota-camry-2024.mp4`
- `tesla-model-y-2023.mp4`
- `ford-f150-lightning-2023.mp4`

## Thumbnails Folder
Place a corresponding video poster preview inside the `./thumbnails/` directory:
`./thumbnails/{make}-{model}-{year}.jpg`

## How to Expand the Vehicle Database
1. **Drop Assets**: Place the new `.mp4` video inside this folder, and a cover `.jpg` inside `./thumbnails/`.
2. **Standardize Names**: Ensure both filenames match the lowercase `{make}-{model}-{year}` structure exactly.
3. **Register in JSON**: Append a new vehicle entry to `backend/app/data/vehicles.json` referencing these files:
   - `videoUrl`: `"/videos/{make}-{model}-{year}.mp4"`
   - `thumbnailUrl`: `"/videos/thumbnails/{make}-{model}-{year}.jpg"`
