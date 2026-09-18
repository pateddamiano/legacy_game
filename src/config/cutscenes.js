// ========================================
// CUTSCENE CONFIGURATION
// ========================================
// Static, full-screen story beats played by CutsceneScene.
//
// A cutscene is a single still background plus a list of dialogue lines. It is
// NOT part of a level's scrolling world - use one whenever a location should be
// shown as a fixed painting rather than something the player walks through.
//
// Played from a level's event list with:
//   { "type": "cutscene", "cutsceneId": "level_3_alley" }
//
// Fields:
//   background   - { key, path } image drawn to fill the 1200x720 virtual screen
//   music        - optional music key to play for the duration of the cutscene
//   musicVolume  - optional volume for that music (defaults to the audio config)
//   portraits    - optional true to show the Tireek/Tryston dialogue portraits
//   lines        - [{ speaker, text }] shown one at a time, typed out

window.CUTSCENE_CONFIGS = {
    // Between level 2 (subway) and level 3 (the studio interior).
    // The alley outside the studio - shown as a still, not a playable area.
    level_3_alley: {
        background: {
            key: 'cutsceneAlley',
            path: 'assets/backgrounds/alley/alley.png'
        },
        music: 'crisisMusic',
        musicVolume: 0.5,
        lines: [
            {
                speaker: 'NARRATOR',
                text: 'The trail off the platform ends in an alley on the edge of town.'
            },
            {
                speaker: 'TIREEK',
                text: 'A rundown studio. Recording light\'s on, so somebody\'s inside.'
            },
            {
                speaker: 'TRYSTON',
                text: 'If The Negatives have our album, it\'s behind that door.'
            },
            {
                speaker: 'TIREEK',
                text: 'Then we go in and take it back.'
            }
        ]
    }
};

console.log('🎬 Cutscene configs loaded:', Object.keys(window.CUTSCENE_CONFIGS).join(', '));
