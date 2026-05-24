/* phones-a.js — Candidate A · Recorder-first · 5 screens */
(() => {
  const target = document.getElementById('cand-a-grid');
  if (!target) return;

  // 01 · HOME — reuse from glance file
  const home = (window.MEMOIR_HOMES && window.MEMOIR_HOMES.A) || '<div class="phone"></div>';

  // 02 · ARCHIVE TAB — day-grouped feed
  const archive = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <div class="app-head" style="padding: 4px 18px 10px;">
          <div>
            <div class="h-title">archive</div>
            <div class="h-sub">all · 2,418 entries</div>
          </div>
          <div class="h-icon">⌕</div>
        </div>

        <!-- filter chips -->
        <div style="padding: 0 18px 12px; display: flex; gap: 5px; overflow: hidden;">
          <span class="chip audio">● audio · 42</span>
          <span class="chip photo">● photo · 23s</span>
          <span class="chip moment">● moment</span>
          <span class="chip note">● note</span>
        </div>

        <div class="app-body" style="padding: 0 18px;">
          <div class="day-hd"><div class="date"><em>Today</em> · May 18</div><div class="meta">3 · 1 session</div></div>
          <div class="entry audio">
            <div class="e-dot"></div>
            <div>
              <div class="when">14:22 · mission</div>
              <div class="title">A voicemail to <em>nobody</em></div>
              <div class="miniwave"><i style="height:30%"></i><i style="height:60%"></i><i style="height:45%"></i><i style="height:80%"></i><i style="height:50%"></i><i style="height:30%"></i><i style="height:70%"></i><i style="height:90%"></i><i style="height:40%"></i><i style="height:65%"></i><i style="height:55%"></i><i style="height:75%"></i><i style="height:35%"></i><i style="height:60%"></i><i style="height:80%"></i><i style="height:45%"></i><i style="height:70%"></i><i style="height:55%"></i></div>
            </div>
          </div>
          <div class="entry photo">
            <div class="e-dot"></div>
            <div>
              <div class="when">11:08 · dolores</div>
              <div class="title"><em>Dolores Park</em> · NW</div>
              <div class="photo-strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+9</div></div>
            </div>
          </div>
          <div class="entry moment">
            <div class="e-dot"></div>
            <div>
              <div class="when">09:42 · hearth</div>
              <div class="title">Coffee, alone</div>
            </div>
          </div>

          <div class="day-hd"><div class="date">Sunday · May 17</div><div class="meta">3 · 2 sessions</div></div>
          <div class="entry note">
            <div class="e-dot"></div>
            <div>
              <div class="when">22:11 · home</div>
              <div class="title">The argument was <em>about the salt.</em></div>
            </div>
          </div>
          <div class="entry photo">
            <div class="e-dot"></div>
            <div>
              <div class="when">15:40 · embarcadero</div>
              <div class="title"><em>Embarcadero</em> · pier 7</div>
              <div class="photo-strip"><div class="thumb"></div><div class="thumb"></div><div class="thumb"></div><div class="more">+19</div></div>
            </div>
          </div>
        </div>

        <div class="tabbar">
          <div class="tab"><div class="ico">●</div>capture</div>
          <div class="tab on"><div class="ico">≡</div>archive</div>
          <div class="tab"><div class="ico">◉</div>atlas</div>
          <div class="tab"><div class="ico">⌕</div>find</div>
        </div>
        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 03 · ENTRY DETAIL — single audio entry, full screen
  const detail = `
    <div class="phone">
      <div class="app" style="background: var(--ink-000);">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>
        <div class="island"></div>

        <!-- back chevron + nav -->
        <div style="padding: 8px 18px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.16em; text-transform: uppercase;">‹ archive</div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.06em;">14 of 147</div>
        </div>

        <div class="app-body" style="padding: 8px 18px 0;">
          <!-- type label + place + when -->
          <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase;">
            <span class="t-ember audio"></span><span>audio · mission · 20th &amp; valencia</span>
          </div>

          <!-- title -->
          <div style="font-family: var(--font-display); font-size: 30px; line-height: 1.05; color: var(--paper-900); margin-top: 10px; letter-spacing: -0.005em;">A voicemail to <em style="color: var(--paper-500); font-style: italic;">nobody in particular</em></div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-400); letter-spacing: 0.16em; text-transform: uppercase; margin-top: 6px;">02:46 · 14:22 · 18°C · clear</div>

          <!-- waveform -->
          <div class="wf" style="margin-top: 18px; height: 70px;">
            ${Array.from({length:54}).map((_,i)=>{const h=Math.abs(Math.sin(i*0.7+1.2)*Math.cos(i*0.31)*0.5+Math.sin(i*1.9)*0.35)+0.2;const p=i/54<0.38;return `<i style="height:${Math.min(95,Math.max(20,h*100))}%; flex: 1;${p?' opacity:1':' opacity:0.55'}" ${p?'class="played"':''}></i>`}).join('')}
            <div class="playhead" style="left: 38%;"></div>
          </div>

          <!-- playback controls -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; font-family: var(--font-mono); font-size: 10px; color: var(--paper-500);">
            <span>00:51</span>
            <div style="display: flex; gap: 22px; align-items: center;">
              <span style="color: var(--paper-700); font-size: 14px;">«</span>
              <span style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--paper-400); display: grid; place-items: center; color: var(--paper-900);">▶</span>
              <span style="color: var(--paper-700); font-size: 14px;">»</span>
            </div>
            <span>02:46</span>
          </div>

          <!-- transcript -->
          <div style="font-family: var(--font-display); font-size: 17px; line-height: 1.55; color: var(--paper-500); margin-top: 14px; max-height: 200px; overflow: hidden;">
            <span style="color: var(--paper-900);">"I keep thinking about the way the light was on the kitchen tile</span> <span style="color: var(--paper-900);">this morning, and how I almost called you about it,</span> <span style="color: var(--paper-900);">and then I didn't.</span> <span style="color: var(--paper-400);">I don't know why I'm recording this. Maybe because there's no one—"</span>
          </div>

          <!-- tags -->
          <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 18px;">
            <span class="chip">voice</span>
            <span class="chip">walking</span>
            <span class="chip">alone</span>
            <span class="chip add">tag</span>
          </div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 04 · AUDIO RECORDING — live state
  const recording = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>

        <!-- dynamic island showing recording state -->
        <div class="island with-content" style="border-color: var(--ember);">
          <span class="ember-dot"></span>
          <span style="color: var(--paper-900);">recording</span>
          <span style="color: var(--paper-500);">00:14</span>
        </div>

        <div class="app-body" style="padding: 60px 18px 0; display: flex; flex-direction: column; gap: 28px;">
          <!-- live context -->
          <div style="display: grid; gap: 6px; text-align: center;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// recording · audio</div>
            <div style="font-family: var(--font-display); font-style: italic; font-size: 26px; color: var(--paper-900); letter-spacing: -0.005em;">Mission · 20th &amp; Valencia</div>
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.06em; margin-top: 2px;">18°C clear · ♪ Avril 14th — Aphex Twin</div>
          </div>

          <!-- big timer -->
          <div style="text-align: center; font-family: var(--font-mono); font-size: 56px; color: var(--ember); letter-spacing: 0.04em; line-height: 1;">00:14<span style="color: var(--paper-500); font-size: 22px; margin-left: 4px;">.32</span></div>

          <!-- live waveform -->
          <div class="wf" style="height: 90px;">
            ${Array.from({length:48}).map((_,i)=>{const h=Math.abs(Math.sin(i*0.9+3)*Math.cos(i*0.5)*0.5+Math.sin(i*1.4)*0.4)+0.15;const live=i>=44;return `<i style="height:${Math.min(95,Math.max(15,h*100))}%;flex:1;${live?'background:var(--ember);box-shadow:0 0 8px var(--ember);opacity:1':''}"></i>`}).join('')}
          </div>

          <!-- transcript preview (live whisper) -->
          <div style="font-family: var(--font-display); font-size: 15px; line-height: 1.55; color: var(--paper-500); padding: 14px 18px; border: 1px solid var(--ink-300); border-radius: 12px; background: rgba(28,25,36,0.3); min-height: 80px;">
            <div style="font-family: var(--font-mono); font-size: 9px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px;">// transcript · live</div>
            <span style="color: var(--paper-900);">"...the kitchen tile this morning, and how I almost</span> <span style="color: var(--paper-400);">called—</span>
          </div>
        </div>

        <!-- record button (recording state) bottom-center -->
        <div style="position: absolute; bottom: 26px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 6;">
          <div class="rec-btn recording"></div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.18em; text-transform: uppercase;">tap to stop</div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // 05 · NOTE CAPTURE · voice-to-note
  const note = `
    <div class="phone">
      <div class="app">
        <div class="status"><span>9:42</span><span class="right"><i></i><i></i><i></i><span class="batt"></span></span></div>

        <div class="island with-content" style="border-color: var(--note);">
          <span class="ember-dot" style="background: var(--note); box-shadow: 0 0 6px var(--note-glow);"></span>
          <span style="color: var(--paper-900);">note · listening</span>
          <span style="color: var(--paper-500);">00:08</span>
        </div>

        <div class="app-body" style="padding: 60px 18px 0; display: flex; flex-direction: column; gap: 22px;">
          <div style="text-align: center;">
            <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-400); letter-spacing: 0.18em; text-transform: uppercase;">// note · voice</div>
            <div style="font-family: var(--font-display); font-style: italic; font-size: 22px; color: var(--paper-500); margin-top: 8px; line-height: 1.35;">Speak a fragment.<br/>We'll write it down.</div>
          </div>

          <!-- live transcript box (the note as it forms) -->
          <div style="font-family: var(--font-display); font-size: 22px; line-height: 1.5; color: var(--paper-900); padding: 20px; border: 1px solid var(--note); border-radius: 14px; background: oklch(74% 0.10 15 / 0.06); min-height: 160px;">
            "Something about the light coming through the window — <span style="color: var(--paper-400);">|</span>"
          </div>

          <!-- seeded context -->
          <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; opacity: 0.7;">
            <span class="chip">mission · 20th &amp; valencia</span>
            <span class="chip">18°C · clear</span>
            <span class="chip">♪ avril 14th</span>
          </div>
        </div>

        <!-- hold-to-record button -->
        <div style="position: absolute; bottom: 26px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 6;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, oklch(82% 0.10 15), oklch(60% 0.10 15)); box-shadow: 0 0 0 4px rgba(28,25,36,0.6), 0 0 0 5px var(--note), 0 0 32px 6px var(--note-glow); display: grid; place-items: center; animation: pulse 2.2s ease-out infinite;">
            <div style="width: 22px; height: 22px; border-radius: 4px; background: var(--paper-900);"></div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; color: var(--paper-500); letter-spacing: 0.18em; text-transform: uppercase;">hold · release to save</div>
        </div>

        <div class="home-bar"></div>
      </div>
    </div>
  `;

  // Captions
  const cap = (step, label, descr) => `
    <div class="phone-cap">
      <div class="step"><b>${step}</b></div>
      <div class="label">${label}</div>
      <div class="descr">${descr}</div>
    </div>
  `;

  target.innerHTML = `
    <div class="col">${home}${cap('01 · home', 'The <em>standing</em> state.', 'Recent entries above; a glowing audio button under the thumb; a row of secondary capture chips just above. Capture is one tap away no matter where the app is.')}</div>
    <div class="col">${archive}${cap('02 · archive', 'Day-grouped feed.', 'A separate tab. Day headers, every entry visible. Photos collapse into session tiles. Filter chips slice by type. Search hides in the search tab.')}</div>
    <div class="col">${detail}${cap('03 · detail', 'Full-screen <em>takeover.</em>', 'Audio entries lead with waveform, transcript, and controls. Swipe left/right between entries; pinch the waveform to scrub. Tags are addable in place.')}</div>
    <div class="col">${recording}${cap('04 · recording', 'Live <em>capture.</em>', 'Big timer, live waveform, Whisper transcribing as you speak. Place + weather + now-playing already attached. Tap the recording button to stop and save.')}</div>
    <div class="col">${note}${cap('05 · note · voice', 'Hold &amp; <em>speak.</em>', 'A note is just a short audio capture you don\'t keep. Hold the rose button, talk for ten seconds, release — Whisper transcribes; the text is the note. Edit later if you want.')}</div>
  `;
})();
