/*
 * app.js — Editor de foto de perfil do Filtro Lula
 * Tudo roda no navegador: nenhuma imagem é enviada para servidor algum.
 */
(function () {
  'use strict';

  var SIZE = window.LulaFrames.SIZE;

  var state = {
    image: null,        // HTMLImageElement | ImageBitmap
    zoom: 1,            // 1 = foto cobrindo o quadro
    offsetX: 0,         // deslocamento em pixels do canvas (1080)
    offsetY: 0,
    frameId: 'estrela',
    shape: 'circulo',
    texto: 'LULA 2026',
    fundo: '#FFFFFF'
  };

  var el = {};
  var ctx = null;
  var frameCache = {};

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ---------------- molduras ---------------- */

  function frameImage(frameId, shape, texto) {
    var frame = window.LulaFrames.byId(frameId);
    var key = frameId + '|' + shape + '|' + (frame.texto === null ? '' : texto);
    if (frameCache[key]) return frameCache[key];

    var url = window.LulaFrames.toDataUrl(frame, shape, frame.texto === null ? '' : texto);
    var promise = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
    frameCache[key] = promise;
    return promise;
  }

  /* ---------------- desenho ---------------- */

  function shapePath(context, shape, size) {
    var c = size / 2;
    context.beginPath();
    if (shape === 'circulo') {
      context.arc(c, c, c, 0, Math.PI * 2);
    } else if (shape === 'arredondado') {
      var r = size * 0.089;
      context.moveTo(r, 0);
      context.lineTo(size - r, 0);
      context.quadraticCurveTo(size, 0, size, r);
      context.lineTo(size, size - r);
      context.quadraticCurveTo(size, size, size - r, size);
      context.lineTo(r, size);
      context.quadraticCurveTo(0, size, 0, size - r);
      context.lineTo(0, r);
      context.quadraticCurveTo(0, 0, r, 0);
    } else {
      context.rect(0, 0, size, size);
    }
    context.closePath();
  }

  function baseScale(img) {
    var w = img.width, h = img.height;
    return Math.max(SIZE / w, SIZE / h);
  }

  function drawPhoto(context, size) {
    var img = state.image;
    if (!img) return;
    var k = size / SIZE;
    var s = baseScale(img) * state.zoom;
    var w = img.width * s * k;
    var h = img.height * s * k;
    var x = size / 2 - w / 2 + state.offsetX * k;
    var y = size / 2 - h / 2 + state.offsetY * k;
    context.drawImage(img, x, y, w, h);
  }

  function renderTo(context, size, frameImg, opaque) {
    context.clearRect(0, 0, size, size);
    context.save();
    shapePath(context, state.shape, size);
    context.clip();
    if (opaque) {
      context.fillStyle = state.fundo;
      context.fillRect(0, 0, size, size);
    }
    drawPhoto(context, size);
    context.restore();
    if (frameImg) context.drawImage(frameImg, 0, 0, size, size);
  }

  var renderPending = false;
  function render() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(function () {
      renderPending = false;
      frameImage(state.frameId, state.shape, state.texto).then(function (frameImg) {
        renderTo(ctx, SIZE, frameImg, !!state.image);
      });
    });
  }

  /* ---------------- carregamento da foto ---------------- */

  function loadFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setStatus('Escolha um arquivo de imagem (JPG, PNG ou WEBP).', true);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setStatus('A imagem é muito grande. Use um arquivo de até 25 MB.', true);
      return;
    }
    setStatus('Carregando sua foto...');

    var done = function (img) {
      state.image = img;
      resetTransform();
      el.editor.classList.add('has-image');
      el.download.disabled = false;
      updateThumbs();
      setStatus('Foto carregada! Arraste para posicionar e use o zoom.');
      render();
    };
    var fail = function () { setStatus('Não foi possível abrir essa imagem. Tente outro arquivo.', true); };

    if (window.createImageBitmap) {
      createImageBitmap(file, { imageOrientation: 'from-image' }).then(done).catch(function () {
        loadViaUrl(file, done, fail);
      });
    } else {
      loadViaUrl(file, done, fail);
    }
  }

  function loadViaUrl(file, done, fail) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { done(img); URL.revokeObjectURL(url); };
    img.onerror = function () { fail(); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function resetTransform() {
    state.zoom = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    el.zoom.value = '100';
    el.zoomLabel.textContent = '100%';
  }

  function setStatus(msg, isError) {
    el.status.textContent = msg;
    el.status.classList.toggle('is-error', !!isError);
  }

  /* ---------------- interação no canvas ---------------- */

  function clampOffset() {
    if (!state.image) return;
    var s = baseScale(state.image) * state.zoom;
    var w = state.image.width * s;
    var h = state.image.height * s;
    var maxX = Math.max(0, (w - SIZE) / 2);
    var maxY = Math.max(0, (h - SIZE) / 2);
    state.offsetX = Math.max(-maxX, Math.min(maxX, state.offsetX));
    state.offsetY = Math.max(-maxY, Math.min(maxY, state.offsetY));
  }

  function setZoom(value) {
    state.zoom = Math.max(1, Math.min(4, value));
    el.zoom.value = String(Math.round(state.zoom * 100));
    el.zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
    clampOffset();
    render();
  }

  function bindCanvas() {
    var pointers = {};
    var lastPinch = 0;

    function toCanvasScale() {
      var rect = el.canvas.getBoundingClientRect();
      return SIZE / rect.width;
    }

    el.canvas.addEventListener('pointerdown', function (e) {
      if (!state.image) return;
      el.canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      el.canvas.classList.add('is-dragging');
    });

    el.canvas.addEventListener('pointermove', function (e) {
      if (!state.image || !pointers[e.pointerId]) return;
      var ids = Object.keys(pointers);
      var prev = pointers[e.pointerId];
      var k = toCanvasScale();

      if (ids.length >= 2) {
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch) setZoom(state.zoom * (dist / lastPinch));
        lastPinch = dist;
        return;
      }

      state.offsetX += (e.clientX - prev.x) * k;
      state.offsetY += (e.clientY - prev.y) * k;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      clampOffset();
      render();
    });

    function release(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) lastPinch = 0;
      if (!Object.keys(pointers).length) el.canvas.classList.remove('is-dragging');
    }
    el.canvas.addEventListener('pointerup', release);
    el.canvas.addEventListener('pointercancel', release);

    el.canvas.addEventListener('wheel', function (e) {
      if (!state.image) return;
      e.preventDefault();
      setZoom(state.zoom * (e.deltaY > 0 ? 0.94 : 1.06));
    }, { passive: false });
  }

  /* ---------------- galeria de molduras ---------------- */

  function buildThumbs() {
    el.frames.innerHTML = '';
    window.LulaFrames.list.forEach(function (frame) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frame-option' + (frame.id === state.frameId ? ' is-active' : '');
      btn.setAttribute('aria-pressed', frame.id === state.frameId ? 'true' : 'false');
      btn.dataset.frame = frame.id;
      btn.title = frame.descricao;
      btn.innerHTML =
        '<span class="frame-thumb" data-thumb="' + frame.id + '">' +
        '<img alt="" src="' + window.LulaFrames.toDataUrl(frame, state.shape, frame.texto === null ? '' : state.texto) + '">' +
        '</span><span class="frame-name">' + frame.nome + '</span>';
      btn.addEventListener('click', function () {
        state.frameId = frame.id;
        if (frame.texto) {
          state.texto = frame.texto;
          el.texto.value = frame.texto;
        }
        el.texto.disabled = frame.texto === null;
        $$('.frame-option').forEach(function (b) {
          var active = b.dataset.frame === frame.id;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        updateThumbs();
        render();
      });
      el.frames.appendChild(btn);
    });
    updateThumbs();
  }

  function updateThumbs() {
    var photo = state.image ? thumbBackground() : null;
    window.LulaFrames.list.forEach(function (frame) {
      var holder = el.frames.querySelector('[data-thumb="' + frame.id + '"]');
      if (!holder) return;
      var img = holder.querySelector('img');
      img.src = window.LulaFrames.toDataUrl(frame, state.shape, frame.texto === null ? '' : state.texto);
      holder.style.backgroundImage = photo ? 'url(' + photo + ')' : '';
      holder.classList.toggle('is-circle', state.shape === 'circulo');
      holder.classList.toggle('is-rounded', state.shape === 'arredondado');
    });
  }

  var thumbCache = { key: '', url: '' };
  function thumbBackground() {
    var key = state.zoom + '|' + state.offsetX + '|' + state.offsetY + '|' + (state.image ? state.image.width : 0);
    if (thumbCache.key === key) return thumbCache.url;
    var c = document.createElement('canvas');
    c.width = c.height = 220;
    var cc = c.getContext('2d');
    cc.fillStyle = state.fundo;
    cc.fillRect(0, 0, 220, 220);
    drawPhoto(cc, 220);
    thumbCache.key = key;
    thumbCache.url = c.toDataURL('image/jpeg', 0.75);
    return thumbCache.url;
  }

  /* ---------------- download ---------------- */

  function download() {
    if (!state.image) return;
    setStatus('Preparando o download...');
    frameImage(state.frameId, state.shape, state.texto).then(function (frameImg) {
      var out = document.createElement('canvas');
      out.width = out.height = SIZE;
      var octx = out.getContext('2d');
      renderTo(octx, SIZE, frameImg, state.shape !== 'circulo');
      out.toBlob(function (blob) {
        if (!blob) { setStatus('Não foi possível gerar o arquivo. Tente novamente.', true); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'minha-foto-lula-2026.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        setStatus('Pronto! Sua foto foi baixada. Agora é só atualizar seu perfil.');
      }, 'image/png');
    });
  }

  /* ---------------- inicialização ---------------- */

  function init() {
    el.editor = $('#editor-app');
    el.canvas = $('#preview');
    el.input = $('#file-input');
    el.dropzone = $('#dropzone');
    el.zoom = $('#zoom');
    el.zoomLabel = $('#zoom-label');
    el.center = $('#btn-center');
    el.download = $('#btn-download');
    el.status = $('#status');
    el.frames = $('#frames');
    el.texto = $('#texto');
    if (!el.canvas) return;

    el.canvas.width = el.canvas.height = SIZE;
    ctx = el.canvas.getContext('2d');

    buildThumbs();
    bindCanvas();
    render();

    el.input.addEventListener('change', function (e) {
      loadFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });

    $$('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () { el.input.click(); });
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      el.dropzone.addEventListener(ev, function (e) {
        e.preventDefault();
        el.dropzone.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      el.dropzone.addEventListener(ev, function (e) {
        e.preventDefault();
        el.dropzone.classList.remove('is-over');
      });
    });
    el.dropzone.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
    });

    window.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') === 0) {
          loadFile(items[i].getAsFile());
          break;
        }
      }
    });

    el.zoom.addEventListener('input', function () {
      setZoom(parseInt(el.zoom.value, 10) / 100);
    });

    el.center.addEventListener('click', function () {
      resetTransform();
      updateThumbs();
      render();
    });

    el.download.addEventListener('click', download);

    el.texto.addEventListener('input', function () {
      state.texto = el.texto.value.slice(0, 26);
      updateThumbs();
      render();
    });

    $$('[data-shape]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.shape = btn.dataset.shape;
        $$('[data-shape]').forEach(function (b) {
          var active = b.dataset.shape === state.shape;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        el.canvas.classList.toggle('is-circle', state.shape === 'circulo');
        el.canvas.classList.toggle('is-rounded', state.shape === 'arredondado');
        updateThumbs();
        render();
      });
    });

    // menu mobile
    var toggle = $('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('.site-nav a').forEach(function (a) {
        a.addEventListener('click', function () {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // ano no rodapé
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
