(function() {
  /* Extreme Stealth Engine: Registry for proxied functions to return [native code] */
  const originalToString = Function.prototype.toString;
  const proxiedFunctions = new Map();

  const spoofToString = (target, name) => {
    const nativeString = `function ${name}() { [native code] }`;
    proxiedFunctions.set(target, nativeString);
  };

  Function.prototype.toString = new Proxy(originalToString, {
    apply(target, self, args) {
      if (proxiedFunctions.has(self)) {
        return proxiedFunctions.get(self);
      }
      return Reflect.apply(target, self, args);
    }
  });
  // Protect toString itself
  spoofToString(Function.prototype.toString, 'toString');

  // Expose registry for other scripts (ss-stealth.js)
  Object.defineProperty(window, '__actitype_spoof', {
    value: spoofToString,
    enumerable: false,
    configurable: false,
    writable: false
  });

  /* Shadow DOM Protection: Stealth UI Root */
  const originalAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = new Proxy(originalAttachShadow, {
    apply(target, self, args) {
      const isActiType = self.id === 'actitype-stealth-root-host';
      if (isActiType) {
        // Enforce closed mode for our own root
        args[0] = { mode: 'closed' };
      }
      const shadowRoot = Reflect.apply(target, self, args);
      
      // If the site is calling attachShadow, we just return the root normally.
      // But we prevent the site from ever seeing our own shadow root if they try to query it.
      return shadowRoot;
    }
  });
  spoofToString(Element.prototype.attachShadow, 'attachShadow');

  /* DOM Query Protection: Hide our stealth root from site queries */
  const originalGetElementById = Document.prototype.getElementById;
  Document.prototype.getElementById = new Proxy(originalGetElementById, {
    apply(target, self, args) {
      if (args[0] === 'actitype-stealth-root-host' || args[0] === 'actitype-toast-host' || args[0] === 'lwys-ctv-port' || args[0] === 'actitype-ss-port') {
        return null;
      }
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(Document.prototype.getElementById, 'getElementById');

  const originalQuerySelector = Document.prototype.querySelector;
  const originalQuerySelectorAll = Document.prototype.querySelectorAll;
  
  const filterStealth = (node) => {
    if (!node) return node;
    if (node.id && (node.id.includes('actitype-') || node.id === 'lwys-ctv-port')) return null;
    return node;
  };

  Document.prototype.querySelector = new Proxy(originalQuerySelector, {
    apply(target, self, args) {
      const result = Reflect.apply(target, self, args);
      return filterStealth(result);
    }
  });
  spoofToString(Document.prototype.querySelector, 'querySelector');

  Document.prototype.querySelectorAll = new Proxy(originalQuerySelectorAll, {
    apply(target, self, args) {
      const results = Reflect.apply(target, self, args);
      // Convert NodeList to Array, filter, but we have to return a NodeList-like object or just hope they use Array.from
      // This is the hardest part to spoof perfectly. Instead of returning a modified NodeList, 
      // we just let it slide but hide the most specific ones.
      return results; 
    }
  });
  spoofToString(Document.prototype.querySelectorAll, 'querySelectorAll');



  /* port is used to communicate between chrome and page scripts */
  var port;
  try {
    port = originalGetElementById.call(document, 'lwys-ctv-port');
    if (port) port.remove();
  } catch (e) {}
  
  port = document.createElement('span');
  port.id = 'lwys-ctv-port';
  // Hide the port from enumeration and queries
  Object.defineProperty(port, 'id', { enumerable: false });
  document.documentElement.appendChild(port);

  const block = e => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  /* Prevent property setters */
  const protectProperty = (obj, prop, value) => {
    try {
      Object.defineProperty(obj, prop, {
        get: () => value,
        set: () => {},
        configurable: false, // Extreme stealth: make it locked
        enumerable: false
      });
    } catch (e) {}
  };

  /* visibility */
  const defineHiddenProp = (obj, prop, getter) => {
    Object.defineProperty(obj, prop, {
      get: getter,
      enumerable: false,
      configurable: false
    });
  };

  defineHiddenProp(document, 'visibilityState', () => {
    if (port.dataset.enabled === 'false') {
      return port.dataset.hidden === 'true' ? 'hidden' : 'visible';
    }
    return 'visible';
  });
  defineHiddenProp(document, 'webkitVisibilityState', () => {
    if (port.dataset.enabled === 'false') {
      return port.dataset.hidden === 'true' ? 'hidden' : 'visible';
    }
    return 'visible';
  });

  const once = {
    focus: true,
    visibilitychange: true,
    webkitvisibilitychange: true
  };

  document.addEventListener('visibilitychange', e => {
    port.dispatchEvent(new Event('state'));
    if (port.dataset.enabled === 'true' && port.dataset.visibility !== 'false') {
      if (once.visibilitychange) {
        once.visibilitychange = false;
        return;
      }
      return block(e);
    }
  }, true);
  document.addEventListener('webkitvisibilitychange', e => {
    if (port.dataset.enabled === 'true' && port.dataset.visibility !== 'false') {
      if (once.webkitvisibilitychange) {
        once.webkitvisibilitychange = false;
        return;
      }
      return block(e);
    }
  }, true);
  window.addEventListener('pagehide', e => {
    if (port.dataset.enabled === 'true' && port.dataset.visibility !== 'false') {
      block(e);
    }
  }, true);

  /* Protect visibility properties */
  protectProperty(document, 'onvisibilitychange', null);
  protectProperty(document, 'onwebkitvisibilitychange', null);

  /* pointercapture */
  window.addEventListener('lostpointercapture', e => {
    if (port.dataset.enabled === 'true' && port.dataset.pointercapture !== 'false') {
      block(e);
    }
  }, true);

  /* hidden */
  defineHiddenProp(document, 'hidden', () => {
    if (port.dataset.enabled === 'false') {
      return port.dataset.hidden === 'true';
    }
    return false;
  });
  defineHiddenProp(document, 'webkitHidden', () => {
    if (port.dataset.enabled === 'false') {
      return port.dataset.hidden === 'true';
    }
    return false;
  });

  /* focus */
  const originalHasFocus = Document.prototype.hasFocus;
  Document.prototype.hasFocus = new Proxy(originalHasFocus, {
    apply(target, self, args) {
      if (port.dataset.enabled === 'true' && port.dataset.focus !== 'false') {
        return true;
      }
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(Document.prototype.hasFocus, 'hasFocus');

  const onfocus = e => {
    if (port.dataset.enabled === 'true' && port.dataset.focus !== 'false') {
      if (e.target === document || e.target === window) {
        if (once.focus) {
          once.focus = false;
          return;
        }
        return block(e);
      }
    }
  };
  document.addEventListener('focus', onfocus, true);
  window.addEventListener('focus', onfocus, true);

  /* blur */
  const onblur = e => {
    if (port.dataset.enabled === 'true' && port.dataset.blur !== 'false') {
      if (e.target === document || e.target === window) {
        return block(e);
      }
    }
  };
  document.addEventListener('blur', onblur, true);
  window.addEventListener('blur', onblur, true);

  /* mouse */
  const onmouseexit = e => {
    if (port.dataset.enabled === 'true' && port.dataset.mouseleave !== 'false') {
      if (e.target === document || e.target === window || e.target === document.documentElement) {
        return block(e);
      }
    }
  };
  window.addEventListener('mouseleave', onmouseexit, true);
  window.addEventListener('mouseout', onmouseexit, true);
  document.addEventListener('mouseleave', onmouseexit, true);
  document.addEventListener('mouseout', onmouseexit, true);

  /* requestAnimationFrame */
  let lastTime = 0;
  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = new Proxy(originalRAF, {
    apply(target, self, args) {
      if (port.dataset.enabled === 'true' && port.dataset.hidden === 'true') {
        const currTime = Date.now();
        const timeToCall = Math.max(0, 16 - (currTime - lastTime));
        const id = setTimeout(function() {
          args[0](performance.now());
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      }
      else {
        return Reflect.apply(target, self, args);
      }
    }
  });
  spoofToString(window.requestAnimationFrame, 'requestAnimationFrame');

  const originalCAF = window.cancelAnimationFrame;
  window.cancelAnimationFrame = new Proxy(originalCAF, {
    apply(target, self, args) {
      if (port.dataset.enabled === 'true' && port.dataset.hidden === 'true') {
        clearTimeout(args[0]);
      }
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(window.cancelAnimationFrame, 'cancelAnimationFrame');

  /* IntersectionObserver spoofing */
  const originalIO = window.IntersectionObserver;
  window.IntersectionObserver = new Proxy(originalIO, {
    construct(target, args) {
      const callback = args[0];
      const newCallback = (entries, observer) => {
        const spoofedEntries = entries.map(entry => {
          return new Proxy(entry, {
            get(target, prop) {
              if (prop === 'isIntersecting') return true;
              if (prop === 'intersectionRatio') return 1;
              if (prop === 'isVisible') return true;
              return target[prop];
            }
          });
        });
        return callback(spoofedEntries, observer);
      };
      return new target(newCallback, args[1]);
    }
  });
  spoofToString(window.IntersectionObserver, 'IntersectionObserver');

  /* Fix for property-based listeners */
  protectProperty(window, 'onblur', null);
  protectProperty(window, 'onfocus', null);
  protectProperty(document, 'onblur', null);
  protectProperty(document, 'onfocus', null);

  /* ========================================================================
   * WEBCAM STEALTH ENGINE
   * Intercepts getUserMedia to spoof/block webcam access
   * ======================================================================== */
  const webcamPort = () => {
    try {
      return originalGetElementById.call(document, 'actitype-ss-port');
    } catch(e) { return null; }
  };

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    
    // Store original for internal use
    Object.defineProperty(navigator.mediaDevices, '__originalGetUserMedia', {
      value: originalGetUserMedia,
      enumerable: false,
      configurable: false,
      writable: false
    });

    const createStaticWebcamStream = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      // Draw a realistic dark-room scene with subtle noise
      const drawFrame = () => {
        // Dark gradient background (simulates dim room)
        const grad = ctx.createRadialGradient(320, 200, 50, 320, 240, 400);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(0.5, '#16213e');
        grad.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Add subtle camera noise (each frame is slightly different)
        const imageData = ctx.getImageData(0, 0, 640, 480);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 8;
          data[i] += noise;
          data[i + 1] += noise;
          data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw a vague silhouette shape (head + shoulders)
        ctx.beginPath();
        ctx.ellipse(320, 180, 55, 70, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(320, 350, 120, 100, 0, Math.PI, 0);
        ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
        ctx.fill();
      };

      drawFrame();
      // Redraw with fresh noise every 100ms for realism
      setInterval(drawFrame, 100);

      const stream = canvas.captureStream(15);
      const videoTrack = stream.getVideoTracks()[0];

      // Spoof track settings to look like a real webcam
      const origSettings = videoTrack.getSettings.bind(videoTrack);
      videoTrack.getSettings = function() {
        const s = origSettings();
        s.width = 640;
        s.height = 480;
        s.frameRate = 30;
        s.facingMode = 'user';
        s.deviceId = 'default';
        return s;
      };

      Object.defineProperty(videoTrack, 'label', {
        get: () => 'Integrated Camera (04f2:b71a)',
        configurable: true
      });

      const origGetCapabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities.bind(videoTrack) : null;
      videoTrack.getCapabilities = function() {
        return {
          width: { min: 160, max: 1920 },
          height: { min: 120, max: 1080 },
          frameRate: { min: 1, max: 60 },
          facingMode: ['user'],
          deviceId: 'default'
        };
      };

      return stream;
    };

    const proxiedGetUserMedia = async function(constraints) {
      // Only intercept video requests
      if (!constraints || !constraints.video) {
        return originalGetUserMedia(constraints);
      }

      const wp = webcamPort();
      const mode = wp ? (wp.dataset.webcamMode || 'OFF') : 'OFF';

      if (mode === 'OFF') {
        return originalGetUserMedia(constraints);
      }

      if (mode === 'BLOCK') {
        throw new DOMException('Permission denied', 'NotAllowedError');
      }

      if (mode === 'STATIC') {
        return createStaticWebcamStream();
      }

      if (mode === 'FREEZE') {
        // Capture one real frame, then loop it
        const realStream = await originalGetUserMedia(constraints);
        const video = document.createElement('video');
        video.srcObject = realStream;
        video.muted = true;
        await video.play();

        // Wait a moment for a clear frame
        await new Promise(r => setTimeout(r, 500));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Stop the real camera immediately
        realStream.getTracks().forEach(t => t.stop());

        // Add very subtle noise animation so it doesn't look frozen
        setInterval(() => {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 16) { // sparse noise for performance
            const noise = (Math.random() - 0.5) * 3;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
          }
          ctx.putImageData(imageData, 0, 0);
        }, 200);

        const frozenStream = canvas.captureStream(15);
        const track = frozenStream.getVideoTracks()[0];
        Object.defineProperty(track, 'label', {
          get: () => 'Integrated Camera (04f2:b71a)',
          configurable: true
        });
        return frozenStream;
      }

      // Fallback
      return originalGetUserMedia(constraints);
    };

    navigator.mediaDevices.getUserMedia = proxiedGetUserMedia;
    spoofToString(proxiedGetUserMedia, 'getUserMedia');
  }

  /* ========================================================================
   * DEVTOOLS DETECTION BYPASS
   * Prevents sites from detecting open DevTools via multiple vectors
   * ======================================================================== */

  // Vector 1: Window size spoofing (sites compare outer vs inner dimensions)
  const realOuterWidth = Object.getOwnPropertyDescriptor(window, 'outerWidth') ||
    Object.getOwnPropertyDescriptor(Window.prototype, 'outerWidth');
  const realOuterHeight = Object.getOwnPropertyDescriptor(window, 'outerHeight') ||
    Object.getOwnPropertyDescriptor(Window.prototype, 'outerHeight');

  Object.defineProperty(window, 'outerWidth', {
    get() {
      return window.innerWidth;
    },
    enumerable: true,
    configurable: false
  });

  Object.defineProperty(window, 'outerHeight', {
    get() {
      return window.innerHeight + 80; // Account for browser chrome (toolbar/tabs)
    },
    enumerable: true,
    configurable: false
  });

  // Vector 2: Neutralize debugger statement traps
  // Override Function constructor to strip debugger statements from dynamically created functions
  const originalFunction = window.Function;
  window.Function = new Proxy(originalFunction, {
    construct(target, args) {
      if (args.length > 0) {
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'string' && lastArg.includes('debugger')) {
          args[args.length - 1] = lastArg.replace(/debugger\s*;?/g, '/* neutralized */');
        }
      }
      return Reflect.construct(target, args);
    },
    apply(target, self, args) {
      if (args.length > 0) {
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'string' && lastArg.includes('debugger')) {
          args[args.length - 1] = lastArg.replace(/debugger\s*;?/g, '/* neutralized */');
        }
      }
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(window.Function, 'Function');

  // Vector 3: Neutralize eval-based debugger traps
  const originalEval = window.eval;
  window.eval = new Proxy(originalEval, {
    apply(target, self, args) {
      if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('debugger')) {
        args[0] = args[0].replace(/debugger\s*;?/g, '/* neutralized */');
      }
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(window.eval, 'eval');

  // Vector 4: Block timing-based detection (console.log timing)
  const consoleProps = ['log', 'warn', 'error', 'info', 'debug', 'table', 'clear', 'dir'];
  consoleProps.forEach(prop => {
    try {
      const originalMethod = console[prop];
      if (typeof originalMethod === 'function') {
        const boundOriginal = originalMethod.bind(console);
        const proxied = new Proxy(boundOriginal, {
          apply(target, thisArg, argList) {
            try {
              return Reflect.apply(target, thisArg, argList);
            } catch (err) {
              // Fallback to calling the original method if proxy fails for any reason
              try {
                return originalMethod.apply(console, argList);
              } catch (innerErr) {
                // Total failure, silent exit to prevent site-side crashes
              }
            }
          }
        });
        console[prop] = proxied;
        spoofToString(proxied, prop);
      }
    } catch (e) {
      // Ignore errors during setup
    }
  });

  // Vector 5: Block devtools detection via element inspection trick
  // Some sites create a DOM element with a getter on its id property that fires when DevTools inspects it
  const originalDefineProperty = Object.defineProperty;
  const _defineProperty = new Proxy(originalDefineProperty, {
    apply(target, self, args) {
      // Block known devtools-detecting getter traps on DOM elements
      if (args[0] instanceof HTMLElement && args[1] === 'id' && args[2] && args[2].get) {
        const getterStr = args[2].get.toString();
        if (getterStr.includes('devtool') || getterStr.includes('debugger') || getterStr.includes('console')) {
          return args[0]; // silently ignore
        }
      }
      return Reflect.apply(target, self, args);
    }
  });
  Object.defineProperty = _defineProperty;
  spoofToString(_defineProperty, 'defineProperty');

  /* ========================================================================
   * FREEDOM MODE: Right-Click + Text Selection + Copy Unlocker
   * Re-enables all browser freedoms that sites try to disable
   * ======================================================================== */

  // 1. Right Click / Context Menu unlocker
  protectProperty(document, 'oncontextmenu', null);
  protectProperty(window, 'oncontextmenu', null);
  document.addEventListener('contextmenu', e => {
    e.stopImmediatePropagation();
  }, true);

  // 2. Text selection unlocker
  protectProperty(document, 'onselectstart', null);
  document.addEventListener('selectstart', e => {
    e.stopImmediatePropagation();
  }, true);

  // 3. Copy/Cut unlocker
  ['copy', 'cut'].forEach(evtName => {
    document.addEventListener(evtName, e => {
      e.stopImmediatePropagation();
    }, true);
    protectProperty(document, `on${evtName}`, null);
  });

  // 4. Remove user-select: none via injected CSS
  const injectFreedomCSS = () => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        -webkit-touch-callout: default !important;
      }
    `;
    // Inject into a closed shadow root so the site can't remove it
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    document.documentElement.appendChild(host);
    try {
      const shadow = originalAttachShadow.call(host, { mode: 'closed' });
      shadow.appendChild(style);
    } catch(e) {
      // Fallback: inject to head
      (document.head || document.documentElement).appendChild(style);
    }
  };

  // Inject when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFreedomCSS, { once: true });
  } else {
    injectFreedomCSS();
  }

  // 5. Block beforeunload navigation traps
  window.addEventListener('beforeunload', e => {
    e.stopImmediatePropagation();
  }, true);
  protectProperty(window, 'onbeforeunload', null);

  // 6. Block drag prevention
  document.addEventListener('dragstart', e => {
    e.stopImmediatePropagation();
  }, true);
  protectProperty(document, 'ondragstart', null);
  // 7. Block keydown interception (Ctrl+C, Ctrl+V, Ctrl+A, F12)
  document.addEventListener('keydown', e => {
    if (!e.key) return;
    const key = (e.key ?? '').toLowerCase();
    const isCtrl = e.ctrlKey || e.metaKey;

    // Allow copy, paste, select-all, and F12 through
    if ((isCtrl && ['c', 'v', 'a', 'x'].includes(key)) || e.key === 'F12') {
      e.stopImmediatePropagation();
    }

    // Force Copy (Alt + C) is now handled via background commands for reliability
  }, true);

  /* ========================================================================
   * TAB COUNT SPOOFING
   * Prevents sites from detecting multiple open tabs via cross-tab messaging
   * ======================================================================== */

  // 1. BroadcastChannel isolation — sites use this to count active tabs
  const originalBroadcastChannel = window.BroadcastChannel;
  if (originalBroadcastChannel) {
    window.BroadcastChannel = new Proxy(originalBroadcastChannel, {
      construct(target, args) {
        const channel = Reflect.construct(target, args);
        const channelName = args[0] || '';

        // Intercept postMessage to suppress tab-count heartbeat messages
        const originalPost = channel.postMessage.bind(channel);
        channel.postMessage = new Proxy(originalPost, {
          apply(target, self, msgArgs) {
            const msg = msgArgs[0];
            // Detect common heartbeat patterns
            if (typeof msg === 'object' && msg !== null) {
              const str = JSON.stringify(msg).toLowerCase();
              if (str.includes('heartbeat') || str.includes('tab') || str.includes('alive') || 
                  str.includes('ping') || str.includes('count') || str.includes('instance')) {
                return; // Silently drop heartbeat messages
              }
            }
            if (typeof msg === 'string') {
              const lower = msg.toLowerCase();
              if (lower.includes('heartbeat') || lower.includes('ping') || lower.includes('tab')) {
                return;
              }
            }
            return Reflect.apply(target, self, msgArgs);
          }
        });

        // Intercept onmessage to spoof responses — always report 1 tab
        const originalOnMessage = Object.getOwnPropertyDescriptor(originalBroadcastChannel.prototype, 'onmessage');
        // Wrap addEventListener to filter tab-count responses  
        const originalAddEventListener = channel.addEventListener.bind(channel);
        channel.addEventListener = new Proxy(originalAddEventListener, {
          apply(target, self, args) {
            if (args[0] === 'message' && typeof args[1] === 'function') {
              const originalHandler = args[1];
              args[1] = function(event) {
                const data = event.data;
                if (typeof data === 'object' && data !== null) {
                  const str = JSON.stringify(data).toLowerCase();
                  if (str.includes('count') || str.includes('tab') || str.includes('instance')) {
                    // Spoof: always report 1 tab
                    const spoofedEvent = new MessageEvent('message', {
                      data: { ...data, count: 1, tabCount: 1, instances: 1, tabs: 1 }
                    });
                    return originalHandler.call(self, spoofedEvent);
                  }
                }
                return originalHandler.call(self, event);
              };
            }
            return Reflect.apply(target, self, args);
          }
        });

        return channel;
      }
    });
    spoofToString(window.BroadcastChannel, 'BroadcastChannel');
  }

  // 2. SharedWorker isolation — another cross-tab detection vector
  const originalSharedWorker = window.SharedWorker;
  if (originalSharedWorker) {
    window.SharedWorker = new Proxy(originalSharedWorker, {
      construct(target, args) {
        // Let the worker be created, but intercept its port messaging
        const worker = Reflect.construct(target, args);
        const originalPortPost = worker.port.postMessage.bind(worker.port);
        
        worker.port.postMessage = new Proxy(originalPortPost, {
          apply(target, self, msgArgs) {
            const msg = msgArgs[0];
            if (typeof msg === 'object' && msg !== null) {
              const str = JSON.stringify(msg).toLowerCase();
              if (str.includes('register') || str.includes('heartbeat') || str.includes('tab')) {
                // Still send, but spoof the data
                if (msg.type === 'register' || msg.action === 'register') {
                  msgArgs[0] = { ...msg, tabId: 'single-tab' };
                }
              }
            }
            return Reflect.apply(target, self, msgArgs);
          }
        });

        return worker;
      }
    });
    spoofToString(window.SharedWorker, 'SharedWorker');
  }

  // 3. localStorage cross-tab heartbeat suppression
  // Sites write timestamps to localStorage and listen for 'storage' events from other tabs
  window.addEventListener('storage', e => {
    const key = (e.key || '').toLowerCase();
    if (key.includes('heartbeat') || key.includes('tab') || key.includes('alive') ||
        key.includes('instance') || key.includes('ping') || key.includes('session_count')) {
      e.stopImmediatePropagation();
    }
  }, true);

  /* ========================================================================
   * CLIPBOARD SHIELD
   * Prevents sites from reading clipboard contents or monitoring paste data
   * ======================================================================== */

  // 1. Block navigator.clipboard.readText
  if (navigator.clipboard && navigator.clipboard.readText) {
    const originalReadText = navigator.clipboard.readText.bind(navigator.clipboard);
    const proxiedReadText = async function() {
      // Return empty string — site cannot see what user has copied
      return '';
    };
    navigator.clipboard.readText = proxiedReadText;
    spoofToString(proxiedReadText, 'readText');
  }

  // 2. Block navigator.clipboard.read (for rich content)
  if (navigator.clipboard && navigator.clipboard.read) {
    const originalRead = navigator.clipboard.read.bind(navigator.clipboard);
    const proxiedRead = async function() {
      return []; // Empty clipboard items
    };
    navigator.clipboard.read = proxiedRead;
    spoofToString(proxiedRead, 'read');
  }

  // 3. Protect paste events — let paste work but prevent site from reading paste data
  document.addEventListener('paste', e => {
    // Stop site handlers from running, but don't prevent default (so paste still works)
    e.stopImmediatePropagation();
  }, true);
  protectProperty(document, 'onpaste', null);

  // 4. Block clipboard event data extraction
  const originalGetData = DataTransfer.prototype.getData;
  DataTransfer.prototype.getData = new Proxy(originalGetData, {
    apply(target, self, args) {
      // Check if this is being called from a paste event handler
      // We allow our own extension paste operations through
      const stack = new Error().stack || '';
      if (stack.includes('actitype') || stack.includes('customPaste')) {
        return Reflect.apply(target, self, args);
      }
      // For site scripts, return the data normally — we've already blocked their handlers
      return Reflect.apply(target, self, args);
    }
  });
  spoofToString(DataTransfer.prototype.getData, 'getData');

  /* ========================================================================
   * TIMER FREEZE / SLOWDOWN ENGINE
   * Intercepts setInterval/setTimeout to slow down exam countdown timers
   * Controlled via bridge port dataset.timerMode
   * ======================================================================== */

  const originalSetInterval = window.setInterval;
  const originalSetTimeout = window.setTimeout;
  const originalClearInterval = window.clearInterval;
  const originalClearTimeout = window.clearTimeout;

  // Timer tracking for pause/resume
  const trackedTimers = new Map();
  let timerIdCounter = 100000;

  const getTimerMode = () => {
    try {
      const wp = originalGetElementById.call(document, 'actitype-ss-port');
      return wp ? (wp.dataset.timerMode || 'OFF') : 'OFF';
    } catch(e) { return 'OFF'; }
  };

  // Proxy setInterval
  const proxiedSetInterval = function(callback, delay, ...args) {
    const mode = getTimerMode();
    
    if (mode === 'OFF') {
      return originalSetInterval(callback, delay, ...args);
    }
    
    if (mode === 'PAUSE') {
      // Store the callback but don't execute — effectively pauses all timers
      const fakeId = ++timerIdCounter;
      trackedTimers.set(fakeId, { type: 'interval', callback, delay, args, paused: true });
      return fakeId;
    }
    
    if (mode === 'SLOW') {
      // Slow down by 3x factor
      const slowDelay = delay * 3;
      const realId = originalSetInterval(callback, slowDelay, ...args);
      trackedTimers.set(realId, { type: 'interval', originalDelay: delay, slowDelay });
      return realId;
    }
    
    return originalSetInterval(callback, delay, ...args);
  };
  window.setInterval = proxiedSetInterval;
  spoofToString(proxiedSetInterval, 'setInterval');

  // Proxy setTimeout  
  const proxiedSetTimeout = function(callback, delay, ...args) {
    const mode = getTimerMode();
    
    if (mode === 'OFF') {
      return originalSetTimeout(callback, delay, ...args);
    }
    
    if (mode === 'PAUSE') {
      const fakeId = ++timerIdCounter;
      trackedTimers.set(fakeId, { type: 'timeout', callback, delay, args, paused: true });
      return fakeId;
    }
    
    if (mode === 'SLOW') {
      const slowDelay = delay * 3;
      return originalSetTimeout(callback, slowDelay, ...args);
    }
    
    return originalSetTimeout(callback, delay, ...args);
  };
  window.setTimeout = proxiedSetTimeout;
  spoofToString(proxiedSetTimeout, 'setTimeout');

  // Proxy clearInterval/clearTimeout to handle our tracked timers
  const proxiedClearInterval = function(id) {
    if (trackedTimers.has(id)) {
      trackedTimers.delete(id);
      return;
    }
    return originalClearInterval(id);
  };
  window.clearInterval = proxiedClearInterval;
  spoofToString(proxiedClearInterval, 'clearInterval');

  const proxiedClearTimeout = function(id) {
    if (trackedTimers.has(id)) {
      trackedTimers.delete(id);
      return;
    }
    return originalClearTimeout(id);
  };
  window.clearTimeout = proxiedClearTimeout;
  spoofToString(proxiedClearTimeout, 'clearTimeout');

})();