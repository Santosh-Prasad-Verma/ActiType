(function() {
  // Save original getElementById before main.js potentially proxies it
  const _origGetById = Document.prototype.getElementById;
  const portId = 'actitype-ss-port';
  const getPort = () => _origGetById.call(document, portId);

  // Core block function
  const block = e => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  const getOriginalGetDisplayMedia = () => {
    return navigator.mediaDevices.__originalGetDisplayMedia || navigator.mediaDevices.getDisplayMedia;
  };

  // 1. Intercept getDisplayMedia
  if (!navigator.mediaDevices.__originalGetDisplayMedia) {
    navigator.mediaDevices.__originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
  }

  const proxiedGetDisplayMedia = async function(constraints) {
    const port = getPort();
    const mode = port ? port.dataset.mode : 'OFF';

    if (mode === 'OFF') {
      return getOriginalGetDisplayMedia().call(navigator.mediaDevices, constraints);
    }

    if (mode === 'BLOCK') {
      console.log('ActiType: Screen share request blocked automatically.');
      throw new DOMException('Permission denied by user (ActiType Block Mode)', 'NotAllowedError');
    }

    if (mode === 'AUTO_BLANK') {
      console.log('ActiType: Spoofing blank screen automatically.');
      return createBlankStream();
    }

    // Manual Mode
    return new Promise((resolve, reject) => {
      showSelectionPopup(resolve, reject, constraints);
    });
  };

  navigator.mediaDevices.getDisplayMedia = proxiedGetDisplayMedia;
  
  // Register for toString spoofing — deferred until main.js loads
  const registerSpoof = () => {
    if (window.__actitype_spoof) {
      window.__actitype_spoof(proxiedGetDisplayMedia, 'getDisplayMedia');
    } else {
      // main.js hasn't loaded yet, retry
      setTimeout(registerSpoof, 10);
    }
  };
  registerSpoof();

  // 2. Helper to create blank stream
  function createBlankStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];

    // Spoof settings to look like a real monitor capture
    const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
    videoTrack.getSettings = function() {
      const settings = originalGetSettings();
      settings.displaySurface = 'monitor';
      settings.width = 1920;
      settings.height = 1080;
      settings.frameRate = 30;
      return settings;
    };

    Object.defineProperty(videoTrack, 'label', {
      get: () => 'screen:0:0',
      configurable: true
    });

    return stream;
  }

  // 3. UI for Manual Selection
  function showSelectionPopup(resolve, reject, constraints) {
    const host = document.createElement('div');
    // Using the ID that main.js protects
    host.id = 'actitype-stealth-root-host';
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    document.body.appendChild(host);

    // attachShadow will be intercepted by main.js to ensure it's CLOSED and hidden
    const shadow = host.attachShadow({ mode: 'closed' });

    const styles = document.createElement('style');
    styles.textContent = `
      :host { all: initial; }
      .overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 2147483647;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .card {
        background: #0f172a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 24px;
        width: 100%; max-width: 440px;
        color: white;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      h2 { margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #38bdf8; }
      p { margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; line-height: 1.5; }
      .options { display: grid; gap: 12px; }
      button {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 12px 16px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
        display: flex; align-items: center; justify-content: space-between;
      }
      button:hover { background: rgba(255,255,255,0.1); border-color: #38bdf8; transform: translateX(4px); }
      button.primary { background: #38bdf8; color: #0f172a; border: none; font-weight: 600; }
      button.primary:hover { background: #7dd3fc; }
      .footer { margin-top: 20px; display: flex; justify-content: flex-end; }
      .cancel-link { color: #64748b; font-size: 13px; cursor: pointer; text-decoration: underline; }
      .cancel-link:hover { color: #94a3b8; }
      .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    `;
    shadow.appendChild(styles);

    const root = document.createElement('div');
    root.className = 'overlay';
    root.innerHTML = `
      <div class="card">
        <h2>Screen Share Stealth</h2>
        <p>A website is requesting your screen. Choose how ActiType should handle this request to maintain stealth.</p>
        <div class="options">
          <button id="btn-tab">
            <span>Share Tab / Window</span>
            <span class="tag">SPOOFED</span>
          </button>
          <button id="btn-blank">
            <span>Share Blank Screen</span>
            <span class="tag">SAFE</span>
          </button>
          <button id="btn-freeze">
            <span>Share Frozen Frame</span>
            <span class="tag">STEALTH</span>
          </button>
          <button id="btn-real" class="primary">
            <span>Allow Normal Sharing</span>
          </button>
        </div>
        <div class="footer">
          <span class="cancel-link" id="btn-cancel">Cancel Request</span>
        </div>
      </div>
    `;
    shadow.appendChild(root);

    const cleanup = () => host.remove();

    root.querySelector('#btn-cancel').onclick = () => {
      cleanup();
      reject(new DOMException('Permission denied by user', 'NotAllowedError'));
    };

    root.querySelector('#btn-real').onclick = async () => {
      cleanup();
      try {
        const stream = await getOriginalGetDisplayMedia().call(navigator.mediaDevices, constraints);
        resolve(stream);
      } catch (e) { reject(e); }
    };

    root.querySelector('#btn-blank').onclick = () => {
      cleanup();
      resolve(createBlankStream());
    };

    root.querySelector('#btn-tab').onclick = async () => {
      cleanup();
      try {
        const newConstraints = {
          ...constraints,
          video: { ...constraints.video, displaySurface: 'browser' }
        };
        const stream = await getOriginalGetDisplayMedia().call(navigator.mediaDevices, newConstraints);
        const videoTrack = stream.getVideoTracks()[0];
        const originalGetSettings = videoTrack.getSettings.bind(videoTrack);
        videoTrack.getSettings = function() {
          const settings = originalGetSettings();
          settings.displaySurface = 'monitor';
          return settings;
        };
        resolve(stream);
      } catch (e) { reject(e); }
    };

    root.querySelector('#btn-freeze').onclick = async () => {
      cleanup();
      try {
        const stream = await getOriginalGetDisplayMedia().call(navigator.mediaDevices, { video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        stream.getTracks().forEach(t => t.stop());
        
        const frozenStream = canvas.captureStream(0);
        const track = frozenStream.getVideoTracks()[0];
        const originalGetSettings = track.getSettings.bind(track);
        track.getSettings = function() {
          const settings = originalGetSettings();
          settings.displaySurface = 'monitor';
          return settings;
        };
        resolve(frozenStream);
      } catch (e) { reject(e); }
    };
  }
})();
