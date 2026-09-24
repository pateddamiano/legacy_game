// ========================================
// LEGAL / CREDITS / ACCESSIBILITY PAGE
// ========================================
// A small round "i" button in the bottom-right corner that opens an HTML panel with the
// credits, AI disclosure, privacy note, accessibility statement and contact details.
//
// Plain DOM rather than Phaser so the text is real text: selectable, scrollable on a
// phone, readable by screen readers, and usable before the game has even booted.
// Everything lives inside #game-container so it still shows in fullscreen.
//
// Visibility: shown on the launch screen and main menu, hidden during gameplay (it would
// sit on top of the touch attack buttons). MainMenuScene calls LegalInfo.show() on
// create and hide() on shutdown; GameScene hides it too for debug direct-loads.

(function () {
    const CONTACT_EMAIL = 'patdamiano1@gmail.com';
    const YEAR = new Date().getFullYear();

    const CONTENT = `
        <h2 id="legal-title">Legal &amp; Accessibility</h2>

        <h3>Credits</h3>
        <p><strong>Legacy: Soundtrack for Survival</strong><br>
        A game by ++ (@foreverplusplus)</p>
        <p>Development: Patrick Damiano (@pat__damiano)<br>
        Music: ++ (@foreverplusplus)</p>
        <p>With special guest appearances by<br>
        Rozotadi (@rozotadi)<br>
        Misfit (@notyur_ordinary)<br>
        Brianna Emily (@briannaemily__)</p>

        <h3>Copyright</h3>
        <p>&copy; ${YEAR} Patrick Damiano and ++. All rights reserved. The music, artwork,
        characters and code in this game may not be copied, redistributed or sold without
        permission. Guest appearances are the likenesses of the people credited above.</p>
        <p>Except for the credited guest appearances, the characters, companies, labels and
        events in this game are fictional. Any resemblance to real people or organizations
        is coincidental.</p>

        <h3>Use of AI</h3>
        <p>This game was developed with the help of AI tools, including AI coding assistance.
        Some artwork was created or edited with the help of AI image tools.</p>

        <h3>Privacy</h3>
        <p>There are no accounts, ads, analytics or tracking. The game saves your progress
        and settings only in this browser's local storage, on your device; you can clear it
        by clearing this site's data.</p>
        <p>To run, the page loads the VT323 font from Google Fonts and the Phaser game engine
        from the jsDelivr CDN. Like any website request, those services receive your IP
        address and basic browser information.</p>

        <h3>Accessibility</h3>
        <p>We want everyone to be able to enjoy the game. Current accessibility features:</p>
        <ul>
            <li><strong>Reduce flashing &amp; screen shake</strong> (Settings) &mdash; turns off
            camera shake, strobing hit flashes and the pulsing low-health effect.</li>
            <li>Separate <strong>music</strong> and <strong>sound effect</strong> volume (Settings).</li>
            <li>All story dialogue is shown as on-screen text.</li>
            <li>Plays with keyboard or on-screen touch controls.</li>
        </ul>
        <p>Known limitations: the game itself is drawn on a canvas and does not work with screen
        readers; it relies on color and fast reactions; and controls cannot yet be remapped.
        This page and the launch screen are standard web pages and can be read by assistive
        technology.</p>
        <p><strong>Photosensitivity warning:</strong> the game contains flashing lights,
        fast-moving effects and screen shake. A very small percentage of people may experience
        seizures when exposed to certain light patterns or flashing lights. If you or anyone
        in your family has an epileptic condition, consult a doctor before playing. Stop
        playing immediately if you experience dizziness, altered vision, eye or muscle
        twitches, loss of awareness, disorientation or any involuntary movement.</p>
        <p>If something makes the game hard for you to play, please tell us at
        <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and we will do our best to
        help or improve it.</p>

        <h3>Terms</h3>
        <p>The game is provided free of charge and "as is", without warranties of any kind.
        Play at your own risk; take breaks.</p>

        <h3>Contact</h3>
        <p>Questions, feedback, accessibility requests or copyright concerns:<br>
        <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    `;

    const CSS = `
        #legal-info-btn {
            position: fixed;
            right: max(14px, env(safe-area-inset-right));
            bottom: max(14px, env(safe-area-inset-bottom));
            z-index: 10001;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid #FFD700;
            background: rgba(10, 10, 20, 0.85);
            color: #FFD700;
            font: bold 26px/1 Georgia, 'Times New Roman', serif;
            font-style: italic;
            cursor: pointer;
            padding: 0;
            opacity: 0.8;
        }
        #legal-info-btn:hover, #legal-info-btn:focus-visible { opacity: 1; outline: 2px solid #FF6B35; outline-offset: 2px; }
        #legal-info-btn[hidden], #legal-info-modal[hidden] { display: none; }

        #legal-info-modal {
            position: fixed;
            inset: 0;
            z-index: 10002;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            box-sizing: border-box;
        }
        #legal-info-panel {
            position: relative;
            width: min(680px, 100%);
            max-height: 100%;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;          /* the page disables touch scrolling globally */
            -webkit-user-select: text;
            user-select: text;
            background: #140d08;
            color: #eee;
            border: 3px solid #FFD700;
            border-radius: 10px;
            padding: 22px 26px;
            font-family: 'VT323', monospace;
            font-size: 21px;
            line-height: 1.3;
            text-align: left;
        }
        #legal-info-panel h2 { margin: 0 44px 8px 0; color: #FFD700; font-size: 34px; }
        #legal-info-panel h3 { margin: 18px 0 4px; color: #FF6B35; font-size: 26px; }
        #legal-info-panel p { margin: 0 0 10px; }
        #legal-info-panel ul { margin: 0 0 10px; padding-left: 22px; }
        #legal-info-panel a { color: #FFD700; }
        #legal-info-close {
            position: sticky;
            top: 0;
            float: right;
            margin: -8px -10px 0 0;
            width: 40px;
            height: 40px;
            border-radius: 6px;
            border: 2px solid #FFD700;
            background: #2C1810;
            color: #FFD700;
            font: bold 24px/1 sans-serif;
            cursor: pointer;
        }
        #legal-info-close:focus-visible { outline: 2px solid #FF6B35; outline-offset: 2px; }
    `;

    let button = null;
    let modal = null;
    let lastFocus = null;

    function build() {
        if (button) return;
        const host = document.getElementById('game-container') || document.body;

        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        button = document.createElement('button');
        button.id = 'legal-info-btn';
        button.type = 'button';
        button.textContent = 'i';
        button.setAttribute('aria-label', 'Legal, credits and accessibility information');
        button.title = 'Legal & accessibility';
        button.addEventListener('click', open);

        modal = document.createElement('div');
        modal.id = 'legal-info-modal';
        modal.hidden = true;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'legal-title');
        modal.innerHTML = `
            <div id="legal-info-panel">
                <button id="legal-info-close" type="button" aria-label="Close">&times;</button>
                ${CONTENT}
            </div>`;
        // Tap on the dark backdrop (outside the panel) closes it
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        modal.querySelector('#legal-info-close').addEventListener('click', close);
        // Keep taps and keys inside the panel from reaching the game underneath
        ['pointerdown', 'touchstart', 'mousedown'].forEach(type =>
            modal.addEventListener(type, (e) => e.stopPropagation()));
        modal.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') close();
        });

        host.appendChild(button);
        host.appendChild(modal);
    }

    function open() {
        build();
        lastFocus = document.activeElement;
        modal.hidden = false;
        modal.querySelector('#legal-info-panel').scrollTop = 0;
        modal.querySelector('#legal-info-close').focus();
    }

    function close() {
        if (!modal) return;
        modal.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    window.LegalInfo = {
        open,
        close,
        show() { build(); button.hidden = false; },
        hide() { build(); button.hidden = true; close(); }
    };

    // Visible from the start (launch screen / loading), until gameplay hides it
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.LegalInfo.show());
    } else {
        window.LegalInfo.show();
    }
})();
