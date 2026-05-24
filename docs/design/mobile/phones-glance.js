/* phones-glance.js — home screens for the at-a-glance slide */
(() => {

  // ============================================================
  // A · Recorder-first — home
  // ============================================================
  const A_HOME = `
    <div class="phone">
      <div class="app">
        <div class="status">
          <span>9:42</span>
          <span class="right"><i></i><i></i><i></i><span class="batt"></span></span>
        </div>
        <div class="island"></div>

        <div class="app-head">
          <div>
            <div class="h-title">memoir</div>
            <div class="h-sub">today · 3 captured · mission</div>
          </div>
          <div class="h-icon">⌕</div>
        </div>

        <div style="padding: 0 18px 12px;">
          <div class="now-pill">
            <span class="dot"></span>
            <span class="track">Avril 14th</span>
            <span class="artist">· Aphex Twin</span>
          </div>
        </div>

        <div class="app-body" style="padding: 6px 18px 200px;">
          <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase; padding: 4px 0 2px;">recent</div>

          <div class="entry audio">
            <div class="e-dot"></div>
            <div>
              <div class="when">14:22 · mission</div>
              <div class="title">A voicemail to <em>nobody in particular</em></div>
              <div class="miniwave">
                <i style="height:30%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:50%"></i><i style="height:30%"></i><i style="height:70%"></i><i style="height:90%"></i><i style="height:40%"></i><i style="height:65%"></i><i style="height:55%"></i><i style="height:75%"></i><i style="height:35%"></i><i style="height:60%"></i><i style="height:80%"></i><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:35%"></i><i style="height:65%"></i><i style="height:50%"></i><i style="height:30%"></i><i style="height:80%"></i><i style="height:45%"></i>
              </div>
            </div>
          </div>
          <div class="entry photo">
            <div class="e-dot"></div>
            <div>
              <div class="when">11:08 · dolores</div>
              <div class="title"><em>Dolores Park</em> · NW corner</div>
              <div class="photo-strip">
                <div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+9</div>
              </div>
            </div>
          </div>
        </div>

        <!-- floating record button hovering above tab bar -->
        <div style="position: absolute; bottom: 76px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 6;">
          <div style="display: flex; gap: 8px;">
            <span class="chip moment">+ moment</span>
            <span class="chip photo">+ photo</span>
            <span class="chip note">+ note</span>
          </div>
          <div class="rec-btn"></div>
        </div>

        <div class="tabbar">
          <div class="tab on"><div class="ico" style="background: var(--audio); color: var(--ink-000); border-color: var(--audio); box-shadow: 0 0 10px var(--audio-glow);">●</div>capture</div>
          <div class="tab"><div class="ico">≡</div>archive</div>
          <div class="tab"><div class="ico">◉</div>atlas</div>
          <div class="tab"><div class="ico">⌕</div>find</div>
        </div>
        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // ============================================================
  // B · Atlas-first — home (map)
  // ============================================================
  const B_HOME = `
    <div class="phone">
      <div class="app">
        <div class="status" style="color: var(--paper-900);">
          <span>9:42</span>
          <span class="right" style="color: var(--paper-900);"><i></i><i></i><i></i><span class="batt"></span></span>
        </div>

        <!-- dynamic island with now playing -->
        <div class="island with-content">
          <span class="ember-dot"></span>
          <span class="equalizer"><i style="height:2px"></i><i style="height:7px"></i><i style="height:4px"></i><i style="height:9px"></i></span>
          <span style="color: var(--paper-900);">Avril 14th</span>
          <span style="color: var(--paper-500);">Aphex Twin</span>
        </div>

        <!-- the map fills the screen -->
        <div class="app-body" style="position: absolute; inset: 0; padding: 0;">
          <div class="mini-map">
            <svg viewBox="0 0 320 660" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid-b" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
                  <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(243,236,224,0.05)" stroke-width="0.5"/>
                  <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(243,236,224,0.05)" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect width="320" height="660" fill="url(#grid-b)"/>
              <g stroke="rgba(243,236,224,0.1)" stroke-width="1.4" fill="none">
                <path d="M 0 180 Q 120 160 220 200 T 320 220"/>
                <path d="M 0 340 Q 140 320 230 360 T 320 380"/>
                <path d="M 0 500 Q 140 480 220 520 T 320 540"/>
                <path d="M 80 0 Q 70 320 110 660"/>
                <path d="M 200 0 Q 190 320 230 660"/>
              </g>
              <g stroke="rgba(243,236,224,0.04)" stroke-width="0.7" fill="none">
                <path d="M 0 240 Q 140 220 230 260 T 320 280"/>
                <path d="M 0 420 Q 140 400 230 440 T 320 460"/>
                <path d="M 40 0 Q 30 320 70 660"/>
                <path d="M 140 0 Q 130 320 170 660"/>
                <path d="M 260 0 Q 250 320 290 660"/>
              </g>
              <g fill="rgba(60,80,55,0.18)">
                <path d="M 100 200 Q 140 180 160 220 Q 160 260 120 270 Q 90 250 100 220 Z"/>
              </g>
            </svg>

            <div class="heat" style="left: 18%; top: 28%; width: 120px; height: 120px; background: var(--photo); opacity: 0.32;"></div>
            <div class="heat" style="left: 48%; top: 50%; width: 100px; height: 100px; background: var(--audio); opacity: 0.32;"></div>
            <div class="heat" style="left: 35%; top: 70%; width: 90px; height: 90px; background: var(--moment); opacity: 0.28;"></div>

            <div class="place-lbl lg" style="left: 12%; top: 22%;">Mission</div>
            <div class="place-lbl" style="left: 50%; top: 36%;">Dolores</div>
            <div class="place-lbl lg" style="left: 28%; top: 64%;">Castro</div>

            <div class="pin photo" style="left: 22%; top: 30%;"></div>
            <div class="pin photo" style="left: 26%; top: 28%;"></div>
            <div class="pin audio" style="left: 24%; top: 33%;"></div>
            <div class="pin moment" style="left: 20%; top: 32%;"></div>
            <div class="pin photo" style="left: 52%; top: 50%;"></div>
            <div class="pin photo" style="left: 56%; top: 48%;"></div>
            <div class="pin audio" style="left: 50%; top: 54%;"></div>
            <div class="pin note" style="left: 32%; top: 68%;"></div>
            <div class="pin moment" style="left: 38%; top: 72%;"></div>
            <div class="pin moment" style="left: 70%; top: 24%; opacity: 0.5;"></div>
            <div class="pin audio" style="left: 76%; top: 60%; opacity: 0.5;"></div>

            <!-- you are here, top-most -->
            <div class="pin now" style="left: 50%; top: 50%;"></div>
            <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, calc(-50% - 18px)); font-family: var(--font-mono); font-size: 9px; color: var(--paper-900); letter-spacing: 0.16em; text-transform: uppercase; white-space: nowrap; z-index: 3;">here · now</div>
          </div>

          <!-- search affordance, top-right corner under island -->
          <div style="position: absolute; top: 44px; right: 16px; width: 32px; height: 32px; border-radius: 50%; background: rgba(7,6,10,0.6); border: 1px solid var(--ink-300); display: grid; place-items: center; color: var(--paper-700); font-family: var(--font-mono); font-size: 13px; backdrop-filter: blur(8px); z-index: 6;">⌕</div>

          <!-- bottom: today peek + capture FAB -->
          <div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 18px 28px; background: linear-gradient(to top, rgba(7,6,10,0.95) 30%, transparent); display: grid; gap: 14px; z-index: 5;">
            <!-- pull-up handle -->
            <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto;"></div>
            <!-- today line -->
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">today · monday</div>
                <div style="font-family: var(--font-display); font-style: italic; font-size: 22px; color: var(--paper-900); margin-top: 2px; line-height: 1;">3 captured · mission</div>
              </div>
              <div class="rec-btn" style="width: 52px; height: 52px;"></div>
            </div>
          </div>
          <div class="home-bar"></div>
        </div>
      </div>
    </div>
  `;

  // ============================================================
  // C · Spine — home (today feed)
  // ============================================================
  const C_HOME = `
    <div class="phone">
      <div class="app">
        <div class="status">
          <span>9:42</span>
          <span class="right"><i></i><i></i><i></i><span class="batt"></span></span>
        </div>
        <div class="island"></div>

        <div class="app-head" style="padding: 4px 18px 8px; display: grid; gap: 0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <div class="h-title" style="font-size: 28px;"><em>Today</em></div>
              <div class="h-sub">monday · may 18 · mission</div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 11px; color: var(--paper-500); letter-spacing: 0.06em; text-align: right;">
              <div style="display: flex; align-items: center; gap: 5px; justify-content: flex-end;"><span class="dot" style="width:4px;height:4px;border-radius:50%;background:var(--ember);box-shadow:0 0 6px var(--ember);"></span><span style="font-size:9px;letter-spacing:0.1em;color:var(--paper-700);">♪ avril 14th</span></div>
              <div style="font-size:8px;color:var(--paper-400);letter-spacing:0.06em;margin-top:2px;">aphex twin</div>
            </div>
          </div>
        </div>

        <div class="app-body" style="padding: 4px 18px 0; overflow: hidden;">
          <div class="entry audio" style="padding-top: 18px;">
            <div class="e-dot"></div>
            <div>
              <div class="when">14:22 · mission</div>
              <div class="title">A voicemail to <em>nobody in particular</em></div>
              <div class="miniwave">
                <i style="height:30%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:50%"></i><i style="height:30%"></i><i style="height:70%"></i><i style="height:90%"></i><i style="height:40%"></i><i style="height:65%"></i><i style="height:55%"></i><i style="height:75%"></i><i style="height:35%"></i><i style="height:60%"></i><i style="height:80%"></i><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:35%"></i><i style="height:65%"></i><i style="height:50%"></i><i style="height:30%"></i>
              </div>
            </div>
          </div>
          <div class="entry photo">
            <div class="e-dot"></div>
            <div>
              <div class="when">11:08 → 11:14 · dolores</div>
              <div class="title"><em>Dolores Park</em> · NW corner</div>
              <div class="photo-strip">
                <div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+8</div>
              </div>
            </div>
          </div>
          <div class="entry moment">
            <div class="e-dot"></div>
            <div>
              <div class="when">09:42 · hearth</div>
              <div class="title">Coffee, alone</div>
              <div class="place">Church &amp; 18th</div>
            </div>
          </div>
          <div style="font-family: var(--font-display); font-style: italic; font-size: 13px; color: var(--paper-400); padding: 12px 0; border-top: 1px solid var(--ink-300); margin-top: 4px;">— yesterday, 5 captured</div>
        </div>

        <!-- capture bar (above tab bar) -->
        <div style="position: absolute; bottom: 70px; left: 12px; right: 12px; height: 56px; border-radius: 18px; border: 1px solid var(--ink-300); background: rgba(12,10,16,0.92); backdrop-filter: blur(20px); padding: 6px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 6px; z-index: 7;">
          <button style="border: 0; background: linear-gradient(135deg, oklch(72% 0.13 250 / 0.18), oklch(72% 0.13 250 / 0.06)); border-radius: 12px; color: var(--audio); display: flex; align-items: center; justify-content: center; gap: 7px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: var(--audio); box-shadow: 0 0 8px var(--audio-glow);"></span>
            record
          </button>
          <button style="border: 0; background: rgba(28,25,36,0.6); border-radius: 12px; color: var(--photo); display: grid; place-items: center; font-family: var(--font-mono); font-size: 9px;">PHOTO</button>
          <button style="border: 0; background: rgba(28,25,36,0.6); border-radius: 12px; color: var(--moment); display: grid; place-items: center; font-family: var(--font-mono); font-size: 9px;">MOMENT</button>
          <button style="border: 0; background: rgba(28,25,36,0.6); border-radius: 12px; color: var(--note); display: grid; place-items: center; font-family: var(--font-mono); font-size: 9px;">NOTE</button>
        </div>

        <div class="tabbar">
          <div class="tab on"><div class="ico">≡</div>today</div>
          <div class="tab"><div class="ico">⊞</div>roll</div>
          <div class="tab"><div class="ico">◉</div>atlas</div>
          <div class="tab"><div class="ico">⌕</div>find</div>
        </div>
        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // Inject
  const a = document.getElementById('phone-glance-a'); if (a) a.innerHTML = A_HOME;
  const b = document.getElementById('phone-glance-b'); if (b) b.innerHTML = B_HOME;
  const c = document.getElementById('phone-glance-c'); if (c) c.innerHTML = C_HOME;

  // expose for reuse in detail slides — use as first phone in each candidate slide
  window.MEMOIR_HOMES = { A: A_HOME, B: B_HOME, C: C_HOME };
})();
