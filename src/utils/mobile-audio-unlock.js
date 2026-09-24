// ========================================
// MOBILE AUDIO: PLAY THROUGH THE SILENT SWITCH
// ========================================
// iOS puts Web Audio (which Phaser uses for all music and sound) in the "ambient" audio
// session, and the ring/silent switch mutes that - so with the ringer off the game was
// silent. HTML <audio> media uses the "playback" session, which ignores the switch.
//
// unlockMobileAudio() must run inside a user tap (the Launch button). It:
//   1. asks for the playback session directly where supported (Safari 16.4+:
//      navigator.audioSession), and
//   2. for older iOS, starts a looping, silent <audio> element - playing any HTML media
//      moves the whole page into the playback session, Web Audio included.
// The silent loop pauses while the page is hidden so it doesn't keep the session busy.
//
// Side effect (normal for games): like a video, starting the game pauses music the
// player had going in another app. The hardware volume buttons still control volume.

(function () {
    let silentAudio = null;

    // A tiny silent WAV (8-bit mono, 8 kHz, 0.5s of the midpoint value 128) built in code,
    // so there's no extra file to host
    function silentWavUrl() {
        const samples = 4000;
        const buffer = new ArrayBuffer(44 + samples);
        const view = new DataView(buffer);
        const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + samples, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);     // fmt chunk size
        view.setUint16(20, 1, true);      // PCM
        view.setUint16(22, 1, true);      // mono
        view.setUint32(24, 8000, true);   // sample rate
        view.setUint32(28, 8000, true);   // byte rate
        view.setUint16(32, 1, true);      // block align
        view.setUint16(34, 8, true);      // bits per sample
        writeStr(36, 'data');
        view.setUint32(40, samples, true);
        for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128);
        return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    }

    function unlockMobileAudio() {
        // 1. Direct API (Safari 16.4+ / iOS 16.4+)
        try {
            if (navigator.audioSession) navigator.audioSession.type = 'playback';
        } catch (e) {}

        // 2. Silent HTML media loop (older iOS; harmless elsewhere)
        if (silentAudio) return;
        try {
            silentAudio = document.createElement('audio');
            silentAudio.src = silentWavUrl();
            silentAudio.loop = true;
            silentAudio.preload = 'auto';
            silentAudio.setAttribute('playsinline', '');
            silentAudio.setAttribute('x-webkit-airplay', 'deny');
            silentAudio.disableRemotePlayback = true;
            // Must NOT be muted - a muted element doesn't switch the audio session
            const play = silentAudio.play();
            if (play && play.catch) play.catch(() => {});

            document.addEventListener('visibilitychange', () => {
                if (!silentAudio) return;
                if (document.hidden) {
                    silentAudio.pause();
                } else {
                    const p = silentAudio.play();
                    if (p && p.catch) p.catch(() => {});
                }
            });
        } catch (e) {
            console.warn('🔈 Mobile audio unlock failed:', e);
        }
    }

    window.unlockMobileAudio = unlockMobileAudio;
})();
