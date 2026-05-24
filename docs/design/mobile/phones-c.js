/* phones-c.js — Candidate C · Spine · 5 screens */
(() => {
  const target = document.getElementById('cand-c-grid');
  if (!target) return;

  // 01 · HOME — feed of today (reuse)
  const home = (window.MEMOIR_HOMES && window.MEMOIR_HOMES.C) || '<div class="phone"></div>';

  // 02 · BROWSE — scrolled back, year-scrubber visible
  const browse = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <div class="app-head" style="padding: 4px 18px 8px;">
          <div>
            <div class="h-title" style="font-size: 24px;"><em>scroll back</em></div>
            <div class="h-sub">week of may 12 · 18 entries</div>
          </div>
          <div class="h-icon">⌕</div>
        </div>

        <div class="app-body" style="padding: 4px 18px 0; position: relative; overflow: hidden;">
          <!-- year scrubber right edge -->
          <div style="position: absolute; right: 4px; top: 12px; bottom: 80px; width: 14px; display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 4;">
            <div style="font-family: var(--font-mono); font-size: 8px; color: var(--paper-400); letter-spacing: 0.12em;">'23</div>
            <div style="font-family: var(--font-mono); font-size: 8px; color: var(--paper-400); letter-spacing: 0.12em;">'24</div>
            <div style="flex: 1; width: 1px; background: var(--ink-300); position: relative;">
              <div style="position: absolute; right: -4px; top: 70%; width: 9px; height: 9px; background: var(--ember); border-radius: 50%; box-shadow: 0 0 8px var(--ember);"></div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 8px; color: var(--ember); letter-spacing: 0.12em;">'25</div>
            <div style="font-family: var(--font-mono); font-size: 8px; color: var(--paper-400); letter-spacing: 0.12em;">'26</div>
          </div>

          <div style="padding-right: 18px;">
            <div class="day-hd"><div class="date">Friday · May 15</div><div class="meta">4</div></div>
            <div class="entry audio">
              <div class="e-dot"></div>
              <div>
                <div class="when">19:08 · castro</div>
                <div class="title">The bar was <em>loud</em></div>
                <div class="miniwave"><i style="height:50%"></i><i style="height:80%"></i><i style="height:70%"></i><i style="height:90%"></i><i style="height:55%"></i><i style="height:75%"></i><i style="height:60%"></i><i style="height:85%"></i><i style="height:70%"></i><i style="height:50%"></i><i style="height:90%"></i><i style="height:65%"></i><i style="height:80%"></i><i style="height:55%"></i><i style="height:75%"></i></div>
              </div>
            </div>
            <div class="entry photo">
              <div class="e-dot"></div>
              <div>
                <div class="when">15:40 · mission</div>
                <div class="title"><em>Mission</em> · session</div>
                <div class="photo-strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+20</div></div>
              </div>
            </div>
            <div class="entry note">
              <div class="e-dot"></div>
              <div>
                <div class="when">11:32 · home</div>
                <div class="title"><em>"a thought about the rain"</em></div>
              </div>
            </div>

            <div class="day-hd"><div class="date">Thursday · May 14</div><div class="meta">3</div></div>
            <div class="entry moment">
              <div class="e-dot"></div>
              <div>
                <div class="when">18:11 · hayes</div>
                <div class="title">Stopped at the corner</div>
              </div>
            </div>
            <div class="entry photo">
              <div class="e-dot"></div>
              <div>
                <div class="when">14:02 · 24th st</div>
                <div class="title"><em>24th St</em> · session</div>
                <div class="photo-strip"><div class="thumb"></div><div class="thumb"></div><div class="more">+11</div></div>
              </div>
            </div>
          </div>
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

  // 03 · DETAIL — note shown large
  const detail = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <div style="padding: 8px 18px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.16em; text-transform: uppercase;">‹ today</div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.06em;">47 of 147</div>
        </div>

        <div class="app-body" style="padding: 16px 22px 0;">
          <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase;">
            <span class="t-ember note"></span><span>note · sun may 17 · 22:11 · home</span>
          </div>

          <!-- the body of the note, large, takes the screen -->
          <div style="font-family: var(--font-display); font-size: 32px; line-height: 1.25; color: var(--paper-900); margin-top: 28px; letter-spacing: -0.01em;">The argument was <em style="font-style: italic; color: var(--paper-500);">about the salt,</em> but it wasn't about the salt. It never is. Tomorrow I'll buy some lemons and we'll pretend.</div>

          <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--ink-300); display: grid; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase;">place</div>
              <div style="font-family: var(--font-display); font-style: italic; font-size: 18px; color: var(--paper-900);">Home</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase;">weather</div>
              <div style="font-family: var(--font-mono); font-size: 12px; color: var(--paper-700);">15°C · foggy</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase;">song</div>
              <div style="font-family: var(--font-mono); font-size: 12px; color: var(--paper-700);">— silence</div>
            </div>
          </div>

          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 22px;">
            <span class="chip">house</span>
            <span class="chip">night</span>
            <span class="chip add">tag</span>
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 04 · AUDIO RECORDING — capture bar expanded
  const recording = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island with-content" style="border-color: var(--ember);">
          <span class="ember-dot"></span>
          <span style="color: var(--paper-900);">recording</span>
          <span style="color: var(--paper-500);">00:14</span>
        </div>

        <!-- dimmed feed behind -->
        <div class="app-body" style="padding: 16px 18px 0; opacity: 0.25;">
          <div class="entry audio"><div class="e-dot"></div><div><div class="when">14:22</div><div class="title">A voicemail</div></div></div>
          <div class="entry photo"><div class="e-dot"></div><div><div class="when">11:08</div><div class="title">Dolores Park</div></div></div>
        </div>

        <!-- the capture sheet expanded over the bottom half -->
        <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 36%; background: var(--ink-050); border-top: 1px solid var(--ink-300); border-radius: 22px 22px 0 0; padding: 16px 22px 30px; display: flex; flex-direction: column; gap: 20px; box-shadow: 0 -16px 40px rgba(0,0,0,0.55); z-index: 5;">
          <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto;"></div>

          <!-- type switcher with audio active -->
          <div style="display: flex; gap: 6px;">
            <div style="flex: 2; padding: 9px 12px; border-radius: 10px; background: oklch(72% 0.13 250 / 0.16); color: var(--audio); text-align: center; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--audio); box-shadow: 0 0 6px var(--audio-glow);"></span> AUDIO
            </div>
            <div style="flex: 1; padding: 9px 6px; border-radius: 10px; background: rgba(28,25,36,0.5); color: var(--paper-500); text-align: center; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">PHOTO</div>
            <div style="flex: 1; padding: 9px 6px; border-radius: 10px; background: rgba(28,25,36,0.5); color: var(--paper-500); text-align: center; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">MOMENT</div>
            <div style="flex: 1; padding: 9px 6px; border-radius: 10px; background: rgba(28,25,36,0.5); color: var(--paper-500); text-align: center; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;">NOTE</div>
          </div>

          <div style="text-align: center;">
            <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// mission · 20th &amp; valencia · 18°C</div>
            <div style="font-family: var(--font-mono); font-size: 38px; color: var(--ember); letter-spacing: 0.04em; margin-top: 6px;">00:14<span style="color: var(--paper-500); font-size: 16px;">.32</span></div>
          </div>

          <div class="wf" style="height: 56px;">
            ${Array.from({length:36}).map((_,i)=>{const h=Math.abs(Math.sin(i*0.9+3)*Math.cos(i*0.5)*0.5+Math.sin(i*1.4)*0.4)+0.15;const live=i>=33;return `<i style="height:${Math.min(95,Math.max(15,h*100))}%;flex:1;${live?'background:var(--ember);box-shadow:0 0 8px var(--ember);opacity:1':''}"></i>`}).join('')}
          </div>

          <div style="display: flex; align-items: center; justify-content: center; gap: 24px;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.14em; text-transform: uppercase;">cancel</div>
            <div class="rec-btn recording" style="width: 64px; height: 64px;"></div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-900); letter-spacing: 0.14em; text-transform: uppercase;">save</div>
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 05 · NOTE · fragment chips
  const note = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <!-- dim feed behind -->
        <div class="app-body" style="padding: 16px 18px 0; opacity: 0.18;">
          <div class="entry photo"><div class="e-dot"></div><div><div class="when">11:08</div><div class="title">Dolores</div></div></div>
        </div>

        <!-- note sheet -->
        <div style="position: absolute; left: 0; right: 0; bottom: 0; top: 30%; background: var(--ink-050); border-top: 1px solid var(--ink-300); border-radius: 22px 22px 0 0; padding: 14px 22px 240px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 -16px 40px rgba(0,0,0,0.55); z-index: 5;">
          <div style="width: 38px; height: 4px; background: rgba(243,236,224,0.35); border-radius: 4px; margin: 0 auto;"></div>

          <div>
            <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// note · pick a fragment</div>
            <div style="font-family: var(--font-display); font-style: italic; font-size: 22px; color: var(--paper-500); margin-top: 4px; line-height: 1.3;">…or start typing.</div>
          </div>

          <!-- fragment chip grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="padding: 12px 14px; border: 1px solid var(--note); background: oklch(74% 0.10 15 / 0.06); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-900);">"the light…"</div>
            <div style="padding: 12px 14px; border: 1px solid var(--ink-300); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-700);">"a smell…"</div>
            <div style="padding: 12px 14px; border: 1px solid var(--ink-300); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-700);">"what they said…"</div>
            <div style="padding: 12px 14px; border: 1px solid var(--ink-300); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-700);">"a feeling…"</div>
            <div style="padding: 12px 14px; border: 1px solid var(--ink-300); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-700);">"something seen"</div>
            <div style="padding: 12px 14px; border: 1px solid var(--ink-300); border-radius: 12px; font-family: var(--font-display); font-style: italic; font-size: 17px; color: var(--paper-700); text-align: center; color: var(--paper-400);">+ custom</div>
          </div>

          <!-- one line input -->
          <div style="border: 1px solid var(--note); background: oklch(74% 0.10 15 / 0.04); border-radius: 12px; padding: 14px 16px; font-family: var(--font-display); font-size: 20px; color: var(--paper-900); line-height: 1.3; min-height: 60px;">
            <span style="color: var(--paper-700); font-style: italic;">"the light </span><span>was strange today</span><span style="color: var(--paper-400);">|</span>
          </div>
        </div>

        <!-- iOS-style keyboard -->
        <div class="kbd-mock" style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 8;">
          <div class="row">
            <div class="key">q</div><div class="key">w</div><div class="key">e</div><div class="key">r</div><div class="key">t</div><div class="key">y</div><div class="key">u</div><div class="key">i</div><div class="key">o</div><div class="key">p</div>
          </div>
          <div class="row">
            <div class="key">a</div><div class="key">s</div><div class="key">d</div><div class="key">f</div><div class="key">g</div><div class="key">h</div><div class="key">j</div><div class="key">k</div><div class="key">l</div>
          </div>
          <div class="row">
            <div class="key shift">⇧</div><div class="key">z</div><div class="key">x</div><div class="key">c</div><div class="key">v</div><div class="key">b</div><div class="key">n</div><div class="key">m</div><div class="key shift">⌫</div>
          </div>
          <div class="row" style="grid-template-columns: 1fr 4fr 1fr;">
            <div class="key shift" style="font-size:10px;">123</div>
            <div class="space">space</div>
            <div class="key shift" style="background: var(--note); color: var(--ink-000); font-size:10px;">save</div>
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
    <div class="col">${home}${cap('01 · home', 'Today, <em>vertical.</em>', 'A chronological feed — today\'s entries on top, yesterday below. Photo sessions collapse. The capture bar floats just above the tabs: a wide audio button + three small chips for the other types.')}</div>
    <div class="col">${browse}${cap('02 · browse', '<em>Scroll</em> back.', 'Same vertical feed, just kept scrolling. Day headers as you go. A year scrubber appears on the right edge while you scroll fast. Pinch to zoom out to a year-at-a-glance view.')}</div>
    <div class="col">${detail}${cap('03 · detail', 'Quiet <em>page.</em>', 'A note set on its own page like a single piece in a journal. Place, weather, song in a footer block. Swipe left/right for neighbors. Tags addable inline.')}</div>
    <div class="col">${recording}${cap('04 · recording', 'Bar <em>expands.</em>', 'Tap the audio button in the capture bar → it expands into a half-sheet with timer, waveform, and save/cancel. The feed beneath dims. Same shape works for photo, moment, note.')}</div>
    <div class="col">${note}${cap('05 · note · chips', 'Choose a <em>starting line.</em>', 'A 2×3 grid of canonical fragments seeds the input. Tap one → it pre-fills and the cursor is inside. Skip the chips and type cold if you want. Native keyboard.')}</div>
  `;
})();
