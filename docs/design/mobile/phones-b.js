/* phones-b.js — Candidate B · Atlas-first · 5 screens */
(() => {
  const target = document.getElementById('cand-b-grid');
  if (!target) return;

  // 01 · HOME — full map (reuse from glance)
  const home = (window.MEMOIR_HOMES && window.MEMOIR_HOMES.B) || '<div class="phone"></div>';

  // shared minimap (used in all B screens)
  const mapSvg = `
    <svg viewBox="0 0 320 660" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid-b2" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(243,236,224,0.05)" stroke-width="0.5"/>
          <line x1="0" y1="0" x2="0" y2="60" stroke="rgba(243,236,224,0.05)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="320" height="660" fill="url(#grid-b2)"/>
      <g stroke="rgba(243,236,224,0.1)" stroke-width="1.4" fill="none">
        <path d="M 0 180 Q 120 160 220 200 T 320 220"/>
        <path d="M 0 340 Q 140 320 230 360 T 320 380"/>
        <path d="M 0 500 Q 140 480 220 520 T 320 540"/>
        <path d="M 80 0 Q 70 320 110 660"/>
        <path d="M 200 0 Q 190 320 230 660"/>
      </g>
    </svg>
  `;

  // 02 · BROWSE — pull-up sheet halfway, feed visible over map
  const browse = `
    <div class="phone">
      <div class="app">
        <div class="status" style="color: var(--paper-900);"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <div class="app-body" style="position: absolute; inset: 0; padding: 0;">
          <!-- dimmed map below -->
          <div class="mini-map" style="opacity: 0.5;">
            ${mapSvg}
            <div class="heat" style="left: 18%; top: 18%; width: 100px; height: 100px; background: var(--photo); opacity: 0.22;"></div>
            <div class="place-lbl lg" style="left: 12%; top: 12%;">Mission</div>
          </div>

          <!-- the sheet pulled up -->
          <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 38%; background: var(--ink-050); border-top: 1px solid var(--ink-300); border-radius: 22px 22px 0 0; padding: 14px 20px 80px; display: flex; flex-direction: column; box-shadow: 0 -16px 40px rgba(0,0,0,0.5); z-index: 5;">
            <!-- handle -->
            <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto 14px;"></div>

            <div class="day-hd"><div class="date"><em>Today</em> · May 18</div><div class="meta">3 · 1 session</div></div>
            <div class="entry audio">
              <div class="e-dot"></div>
              <div>
                <div class="when">14:22 · mission</div>
                <div class="title">A voicemail to <em>nobody</em></div>
                <div class="miniwave"><i style="height:30%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:50%"></i><i style="height:30%"></i><i style="height:70%"></i><i style="height:90%"></i><i style="height:40%"></i><i style="height:65%"></i><i style="height:55%"></i><i style="height:75%"></i><i style="height:35%"></i><i style="height:60%"></i><i style="height:80%"></i><i style="height:45%"></i></div>
              </div>
            </div>
            <div class="entry photo">
              <div class="e-dot"></div>
              <div>
                <div class="when">11:08 · dolores</div>
                <div class="title"><em>Dolores</em> · session</div>
                <div class="photo-strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+9</div></div>
              </div>
            </div>
            <div class="day-hd"><div class="date">Sunday · May 17</div><div class="meta">5</div></div>
            <div class="entry note">
              <div class="e-dot"></div>
              <div>
                <div class="when">22:11 · home</div>
                <div class="title">The argument <em>was about the salt</em></div>
              </div>
            </div>
          </div>

          <!-- search chip top-left of sheet area -->
          <div style="position: absolute; top: calc(38% - 34px); left: 18px; right: 18px; z-index: 4; display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-700); letter-spacing: 0.14em; text-transform: uppercase; background: rgba(7,6,10,0.7); border: 1px solid var(--ink-300); padding: 5px 10px; border-radius: 100px; backdrop-filter: blur(8px);">⌕ search archive</div>
            <div style="display: flex; gap: 5px;">
              <span class="chip audio" style="font-size:9px;">audio</span>
              <span class="chip photo" style="font-size:9px;">photo</span>
            </div>
          </div>

          <div class="home-bar"></div>
        </div>
      </div>
    </div>
  `;

  // 03 · DETAIL — photo full-bleed (with map context in island)
  const detail = `
    <div class="phone">
      <div class="app">
        <div class="status" style="color: rgba(243,236,224,0.9);"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island with-content">
          <span class="ember-dot"></span>
          <span class="equalizer"><i style="height:2px"></i><i style="height:7px"></i><i style="height:4px"></i><i style="height:9px"></i></span>
          <span style="color: var(--paper-900);">Avril 14th</span>
        </div>

        <!-- full bleed photo placeholder -->
        <div style="position: absolute; inset: 0; background: radial-gradient(ellipse 70% 50% at 50% 45%, rgba(180,140,90,0.2), transparent 60%), repeating-linear-gradient(135deg, rgba(243,236,224,0.025) 0 12px, transparent 12px 24px), linear-gradient(160deg, #382c1c 0%, #1a1410 55%, #0a0808 100%); z-index: 1;"></div>

        <!-- legibility overlays -->
        <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(7,6,10,0.6) 0%, transparent 20%, transparent 65%, rgba(7,6,10,0.92) 100%); z-index: 2; pointer-events: none;"></div>

        <!-- close affordance top-left -->
        <div style="position: absolute; top: 46px; left: 16px; z-index: 6; width: 30px; height: 30px; border-radius: 50%; background: rgba(7,6,10,0.6); border: 1px solid var(--ink-300); display: grid; place-items: center; color: var(--paper-700); font-family: var(--font-mono); font-size: 11px;">×</div>

        <!-- frame counter top-right -->
        <div style="position: absolute; top: 50px; right: 16px; z-index: 6; font-family: var(--font-mono); font-size: 10px; color: var(--paper-700); letter-spacing: 0.06em; background: rgba(7,6,10,0.6); padding: 4px 9px; border-radius: 100px; border: 1px solid var(--ink-300);">7 of 12</div>

        <!-- metadata bottom -->
        <div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 20px 18px 30px; z-index: 6;">
          <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// dolores park · NW corner</div>
          <div style="font-family: var(--font-display); font-style: italic; font-size: 24px; color: var(--paper-900); margin-top: 6px; letter-spacing: -0.005em;">"Eucalyptus, still wet."</div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.06em; margin-top: 6px;">sun · may 18 · 11:11 · 14°C light rain</div>

          <!-- filmstrip -->
          <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; margin-top: 14px; height: 38px;">
            ${Array.from({length:12}).map((_,i)=>{const active=i===6;const dim=i<4||i>9;return `<div style="background: linear-gradient(135deg, #382c1c, #1a1410); border: 1px solid ${active?'var(--paper-400)':'var(--ink-300)'}; opacity: ${dim?0.35:active?1:0.7}; ${active?'box-shadow: 0 0 0 1px var(--paper-400), 0 0 8px rgba(255,220,180,0.2);':''}; position: relative; overflow: hidden;"><div style="position: absolute; inset: 0; background: repeating-linear-gradient(135deg, rgba(255,200,140,0.04) 0 6px, transparent 6px 12px);"></div></div>`}).join('')}
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 04 · AUDIO RECORDING — sheet rises over map
  const recording = `
    <div class="phone">
      <div class="app">
        <div class="status" style="color: var(--paper-900);"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island with-content" style="border-color: var(--ember);">
          <span class="ember-dot"></span>
          <span style="color: var(--paper-900);">recording</span>
          <span style="color: var(--paper-500);">00:14</span>
        </div>

        <!-- dimmed map -->
        <div class="mini-map" style="opacity: 0.3;">
          ${mapSvg}
          <div class="pin now" style="left: 50%; top: 30%;"></div>
        </div>

        <!-- sheet up high -->
        <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 36%; background: var(--ink-050); border-top: 1px solid var(--ink-300); border-radius: 22px 22px 0 0; padding: 16px 22px 30px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 -16px 40px rgba(0,0,0,0.55); z-index: 5;">
          <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto 4px;"></div>

          <div style="text-align: center;">
            <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// recording · audio</div>
            <div style="font-family: var(--font-display); font-style: italic; font-size: 19px; color: var(--paper-900); margin-top: 6px;">Mission · 20th &amp; Valencia</div>
          </div>

          <div style="text-align: center; font-family: var(--font-mono); font-size: 38px; color: var(--ember); letter-spacing: 0.04em; line-height: 1;">00:14<span style="color: var(--paper-500); font-size: 16px;">.32</span></div>

          <div class="wf" style="height: 56px;">
            ${Array.from({length:36}).map((_,i)=>{const h=Math.abs(Math.sin(i*0.9+3)*Math.cos(i*0.5)*0.5+Math.sin(i*1.4)*0.4)+0.15;const live=i>=33;return `<i style="height:${Math.min(95,Math.max(15,h*100))}%;flex:1;${live?'background:var(--ember);box-shadow:0 0 8px var(--ember);opacity:1':''}"></i>`}).join('')}
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 6px;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.14em; text-transform: uppercase;">cancel</div>
            <div class="rec-btn recording" style="width: 64px; height: 64px;"></div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-900); letter-spacing: 0.14em; text-transform: uppercase;">save</div>
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 05 · NOTE · seeded card
  const note = `
    <div class="phone">
      <div class="app">
        <div class="status" style="color: var(--paper-900);"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island with-content">
          <span class="ember-dot"></span>
          <span class="equalizer"><i style="height:2px"></i><i style="height:7px"></i><i style="height:4px"></i><i style="height:9px"></i></span>
          <span style="color: var(--paper-900);">Avril 14th</span>
        </div>

        <!-- map dim -->
        <div class="mini-map" style="opacity: 0.25;">
          ${mapSvg}
          <div class="pin now" style="left: 50%; top: 26%;"></div>
        </div>

        <!-- card sheet — keeps half the map visible -->
        <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 42%; background: var(--ink-050); border-top: 1px solid var(--ink-300); border-radius: 22px 22px 0 0; padding: 16px 22px 32px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 -16px 40px rgba(0,0,0,0.55); z-index: 5;">
          <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto;"></div>

          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <div>
              <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// note · seeded</div>
              <div style="font-family: var(--font-display); font-style: italic; font-size: 22px; color: var(--paper-900); margin-top: 2px;">A fragment.</div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--note); letter-spacing: 0.14em; text-transform: uppercase;">●</div>
          </div>

          <!-- pre-filled context as quiet pills -->
          <div style="display: flex; flex-wrap: wrap; gap: 5px;">
            <span class="chip">📍 mission · 20th &amp; valencia</span>
            <span class="chip">18°C · clear</span>
            <span class="chip">♪ avril 14th</span>
          </div>

          <!-- the one-line input -->
          <div style="border: 1px solid var(--note); background: oklch(74% 0.10 15 / 0.06); border-radius: 12px; padding: 16px 18px; min-height: 56px; font-family: var(--font-display); font-size: 22px; color: var(--paper-900); line-height: 1.3; letter-spacing: -0.005em; position: relative;">
            <span style="color: var(--paper-400); font-style: italic;">"the light was strange today</span><span style="color: var(--paper-900);">|</span>
          </div>

          <!-- save bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.06em;">↩ to save · ⌘+enter</div>
            <button style="border: 0; background: var(--note); color: var(--ink-000); padding: 9px 18px; border-radius: 100px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;">save</button>
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  const cap = (step, label, descr) => `
    <div class="phone-cap">
      <div class="step"><b>${step}</b></div>
      <div class="label">${label}</div>
      <div class="descr">${descr}</div>
    </div>
  `;

  target.innerHTML = `
    <div class="col">${home}${cap('01 · home', 'The <em>atlas.</em>', 'Edge-to-edge map. Your pin pulses at center. The dynamic island carries now-playing. A bottom sheet hint says "today · 3 captured". Long-press anywhere = audio capture at that pin.')}</div>
    <div class="col">${browse}${cap('02 · browse', 'Pull <em>up.</em>', 'The same map dims and the archive sheet rises. Day-grouped feed, just like desktop\'s atlas sidebar. Pull further for fullscreen feed; pull down to dismiss back to map.')}</div>
    <div class="col">${detail}${cap('03 · detail', 'Full <em>takeover.</em>', 'Edge-to-edge media. Type-specific (photo here). Swipe down = back to map at the entry\'s location. Swipe left/right = neighbors. The dynamic island stays as now-playing.')}</div>
    <div class="col">${recording}${cap('04 · recording', 'Sheet <em>rises.</em>', 'Tap the pin (or long-press) → audio sheet opens over a dimmed map. Big timer, live waveform, save/cancel. Pull down to dismiss without saving.')}</div>
    <div class="col">${note}${cap('05 · note · seeded', '<em>Knows</em> the context.', 'Location, weather, song already in pills. The user supplies one line — that\'s it. Total capture time matches a photo. Map context visible behind the card.')}</div>
  `;
})();
