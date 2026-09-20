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
//   showcase     - optional end card (no dialogue): { image: {key, path}, y, height, bobDistance,
//                  bobDuration, glowSize, title, subtitle }. Ends by returning to the main menu.
//   characters   - optional [{ type: 'player'|'extra', name, x, feetY, scale, originY, flipX }]
//                  in-world character models (player idle animation or static extra image)
//   lines        - [{ speaker, text, boxColor, speakerColor }] shown one at a time, typed out.
//                  boxColor/speakerColor are optional per-line overrides (default: gold) for
//                  when a different character's dialogue should stand out, e.g. a new speaker.

window.CUTSCENE_CONFIGS = {
    // Between level 2 (subway) and level 3 (the studio interior).
    // The alley outside the studio - shown as a still, not a playable area.
    level_3_alley: {
        background: {
            key: 'cutsceneAlley',
            path: 'assets/backgrounds/alley/alley.png'
        },
        music: 'fireMusic',
        musicVolume: 0.5,
        // Real in-game models standing on the street, facing Bri. originY is where the
        // feet sit inside the frame (0 = top, 1 = bottom) so they line up on feetY.
        characters: [
            { type: 'player', name: 'tireek', x: 280, feetY: 470, scale: 3.3, originY: 0.875 },
            { type: 'player', name: 'tryston', x: 420, feetY: 472, scale: 3.2, originY: 0.9 },
            { type: 'extra', name: 'brianna_emily', x: 840, feetY: 470, scale: 1.7, originY: 1 }
        ],
        lines: [
            {
                speaker: 'NARRATOR',
                text: 'The trail off the platform ends in an alley on the edge of town.'
            },
            {
                speaker: 'BRI',
                text: 'Tireek! Tryston! I got a tip that the people who stole your album are in that studio.',
                boxColor: 0xC026D3,
                speakerColor: '#E879F9'
            },
            {
                speaker: 'TIREEK',
                text: 'You sure it\'s them?'
            },
            {
                speaker: 'BRI',
                text: 'Positive. Recording light\'s on, and nobody around here books studio time this late.',
                boxColor: 0xC026D3,
                speakerColor: '#E879F9'
            },
            {
                speaker: 'TRYSTON',
                text: 'If The Negatives have our album, it\'s behind that door.'
            },
            {
                speaker: 'TIREEK',
                text: 'Then we go in and take it back.'
            },
            {
                speaker: 'BRI',
                text: 'Just be careful in there. Whatever they have waiting for you, this is going to be a trial by fire.',
                boxColor: 0xC026D3,
                speakerColor: '#E879F9'
            }
        ]
    },

    // End of the game, after the level 4 boss fight. Stays up until the player
    // presses SPACE / taps to return to the main menu.
    ending_golden_record: {
        // No music key: "Satellites" already started when the Negatives fell (level 4 events)
        showcase: {
            image: { key: 'endingGoldenRecord', path: 'assets/ending/goldenrecord.png' },
            y: 290,            // centre of the record and its glow
            height: 400,       // displayed height of the record image
            bobDistance: 12,   // how far it hovers up and down
            bobDuration: 1800,
            glowSize: 760,
            title: 'THE END',
            subtitle: 'Listen to LEGACY (Deluxe) by ++ now'
        }
    }
};

console.log('🎬 Cutscene configs loaded:', Object.keys(window.CUTSCENE_CONFIGS).join(', '));
