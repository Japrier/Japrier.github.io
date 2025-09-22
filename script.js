document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  const flavorSelect = document.getElementById("flavorSelect");
  const candleCountDisplay = document.getElementById("candleCount");
  let candles = [];
  let audioContext;
  let analyser;
  let microphone;

  function toHex(str) {
    return [...str].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  }
  function fromHex(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  let currentMessage = "";

  function updateCandleCount() {
    const activeCandles = candles.filter(c => !c.classList.contains("out")).length;
    candleCountDisplay.textContent = activeCandles;
  }

  function addCandle(left, top) {
    const candle = document.createElement("div");
    candle.className = "candle";
    const candleHeight = 30;
    candle.style.left = left + "px";
    candle.style.top = top - candleHeight + "px";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    cake.appendChild(candle);
    candles.push(candle);
    updateCandleCount();
  }

  cake.addEventListener("click", function (event) {
    const rect = cake.getBoundingClientRect();
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;
    addCandle(left, top);
  });

  function isBlowing() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    let average = sum / bufferLength;
    return average > 40;
  }

  function blowOutCandles() {
    let blownOut = 0;
    if (isBlowing()) {
      candles.forEach(candle => {
        if (!candle.classList.contains("out") && Math.random() > 0.5) {
          candle.classList.add("out");
          blownOut++;
        }
      });
    }
    if (blownOut > 0) {
      updateCandleCount();
    }
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        setInterval(blowOutCandles, 200);
      })
      .catch(function (err) {
        console.log("Unable to access microphone: " + err);
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
  }

  window.addCandleAt = addCandle;
  window.updateCandleCount = updateCandleCount;

  window.resetCandles = function () {
    candles.forEach(c => c.remove());
    candles = [];
    updateCandleCount();
    currentMessage = "";
    customMessageInput.value = "";
    customMessageDisplay.textContent = "";
    history.replaceState(null, '', location.pathname);
  };

  const setMessageBtn = document.getElementById("setMessageBtn");
  const customMessageInput = document.getElementById("customMessageInput");
  const customMessageDisplay = document.getElementById("customMessageDisplay");

  setMessageBtn?.addEventListener("click", () => {
    currentMessage = customMessageInput.value.trim();
    customMessageDisplay.textContent = currentMessage || "";
  });

  function encodeCandlePoints() {
    const rect = cake.getBoundingClientRect();
    return candles.map(c => {
      const left = parseFloat(c.style.left);
      const top = parseFloat(c.style.top) + 30;
      const xp = Math.max(0, Math.min(1, left / rect.width));
      const yp = Math.max(0, Math.min(1, top / rect.height));
      return xp.toFixed(4) + "_" + yp.toFixed(4);
    }).join("-");
  }

  function decodeCandlePoints(str) {
    if (!str) return [];
    const rect = cake.getBoundingClientRect();
    return str.split("-").map(p => {
      const [xp, yp] = p.split("_").map(Number);
      return [xp * rect.width, yp * rect.height];
    });
  }

  function restoreCandles(pts) {
    pts.forEach(([x, y]) => addCandle(x, y));
    updateCandleCount();
  }

  const shareBtn = document.getElementById("shareBtn");
  shareBtn?.addEventListener("click", () => {
    const candleHash = encodeCandlePoints();
    const hexMessage = toHex(currentMessage);
    const flavor = flavorSelect?.value || "chocolate"; // get selected flavor

    const hashStr = `#c=${candleHash}&m=${hexMessage}&f=${flavor}`;
    const urlWithHash = location.pathname + hashStr;
    history.replaceState(null, '', urlWithHash);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).catch(() => {});
    }
    alert("Share link ready! (Copied to clipboard if allowed)");
  });

  function restoreFromHash() {
    if (!location.hash) return;

    const hash = location.hash.slice(1);
    const params = new URLSearchParams(hash.replace(/&/g, "&"));
    const cParam = params.get("c");
    const mParam = params.get("m");
    const fParam = params.get("f");

    if (cParam) {
      const pts = decodeCandlePoints(cParam);
      restoreCandles(pts);
    }

    if (mParam) {
      try {
        currentMessage = fromHex(mParam);
        customMessageInput.value = currentMessage;
        customMessageDisplay.textContent = currentMessage || "";
      } catch {
        currentMessage = "";
      }
    }

    // ✅ Apply flavor
    if (fParam === "vanilla") {
      cake.classList.add("vanilla");
      if (flavorSelect) flavorSelect.value = "vanilla";
    } else {
      cake.classList.remove("vanilla");
      if (flavorSelect) flavorSelect.value = "chocolate";
    }
  }

  // ✅ Listen for flavor changes
  if (flavorSelect) {
    flavorSelect.addEventListener("change", () => {
      const selected = flavorSelect.value;
      if (selected === "vanilla") {
        cake.classList.add("vanilla");
      } else {
        cake.classList.remove("vanilla");
      }
    });
  }

  restoreFromHash();
});
