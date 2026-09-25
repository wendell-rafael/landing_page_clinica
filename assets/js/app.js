/*
 * app.js — Editor de foto de perfil do Filtro Lula
 * Tudo roda no navegador: nenhuma imagem é enviada para servidor algum.
 */
(function () {
  'use strict';

  var SIZE = window.LulaFrames.SIZE;

  // Fundos disponíveis no modo "só texto"
  var FUNDOS = [
    { id: 'vermelho', nome: 'Vermelho', de: '#D51A33', para: '#8E0C22', texto: '#FFFFFF' },
    { id: 'amarelo', nome: 'Amarelo', de: '#FFD24A', para: '#E8951A', texto: '#8E0C22' },
    { id: 'escuro', nome: 'Escuro', de: '#26282E', para: '#0B0C0F', texto: '#FFFFFF' },
    { id: 'claro', nome: 'Claro', de: '#FFFFFF', para: '#EFE9E5', texto: '#C4122F' }
  ];

  var FONTE_FRASE = "'Archivo Black','Arial Black','Helvetica Neue',Arial,sans-serif";

  var state = {
    modo: 'foto',       // 'foto' | 'texto'
    frase: 'Sou Wendell e estou com o Lula',
    fundoId: 'vermelho',
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
    if (state.modo === 'texto') {
      drawFundo(context, size);
      drawFrase(context, size);
    } else {
      if (opaque) {
        context.fillStyle = state.fundo;
        context.fillRect(0, 0, size, size);
      }
      drawPhoto(context, size);
    }
    context.restore();
    if (frameImg) context.drawImage(frameImg, 0, 0, size, size);
  }

  function fundoAtual() {
    for (var i = 0; i < FUNDOS.length; i++) if (FUNDOS[i].id === state.fundoId) return FUNDOS[i];
    return FUNDOS[0];
  }

  function drawFundo(context, size) {
    var f = fundoAtual();
    var grad = context.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, f.de);
    grad.addColorStop(1, f.para);
    context.fillStyle = grad;
    context.fillRect(0, 0, size, size);
  }

  // Quebra a frase em linhas que caibam na largura disponível
  function quebrarLinhas(context, texto, larguraMax) {
    var linhas = [];
    String(texto).split(/\n+/).forEach(function (paragrafo) {
      var palavras = paragrafo.split(/\s+/).filter(Boolean);
      if (!palavras.length) return;
      var linha = palavras[0];
      for (var i = 1; i < palavras.length; i++) {
        var teste = linha + ' ' + palavras[i];
        if (context.measureText(teste).width > larguraMax) {
          linhas.push(linha);
          linha = palavras[i];
        } else {
          linha = teste;
        }
      }
      linhas.push(linha);
    });
    return linhas;
  }

  function drawFrase(context, size) {
    var texto = (state.frase || '').trim();
    if (!texto) return;

    var larguraMax = size * (state.shape === 'circulo' ? 0.64 : 0.74);
    var alturaMax = size * (state.shape === 'circulo' ? 0.40 : 0.46);
    var fs = size * 0.135;
    var linhas;

    // Diminui o corpo da fonte até a frase caber na caixa
    while (true) {
      context.font = '900 ' + fs.toFixed(1) + 'px ' + FONTE_FRASE;
      linhas = quebrarLinhas(context, texto, larguraMax);
      var estoura = linhas.some(function (l) { return context.measureText(l).width > larguraMax; });
      if ((!estoura && linhas.length * fs * 1.16 <= alturaMax) || fs <= size * 0.032) break;
      fs *= 0.94;
    }

    var entrelinha = fs * 1.16;
    var centro = size * (state.shape === 'circulo' ? 0.42 : 0.40);
    var y = centro - ((linhas.length - 1) * entrelinha) / 2;

    context.fillStyle = fundoAtual().texto;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    linhas.forEach(function (linha, i) {
      context.fillText(linha, size / 2, y + i * entrelinha);
    });
  }

  function temConteudo() {
    return state.modo === 'texto' ? !!(state.frase || '').trim() : !!state.image;
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

  function buildFundos() {
    if (!el.fundos) return;
    el.fundos.innerHTML = '';
    FUNDOS.forEach(function (f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip chip-cor' + (f.id === state.fundoId ? ' is-active' : '');
      btn.setAttribute('aria-pressed', f.id === state.fundoId ? 'true' : 'false');
      btn.dataset.fundo = f.id;
      btn.innerHTML = '<span class="swatch" style="background:linear-gradient(135deg,' + f.de + ',' + f.para + ')"></span>' + f.nome;
      btn.addEventListener('click', function () {
        state.fundoId = f.id;
        $$('[data-fundo]').forEach(function (b) {
          var ativo = b.dataset.fundo === f.id;
          b.classList.toggle('is-active', ativo);
          b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
        updateThumbs();
        render();
      });
      el.fundos.appendChild(btn);
    });
  }

  function aplicarModo() {
    var texto = state.modo === 'texto';
    el.blocoFoto.hidden = texto;
    el.blocoFrase.hidden = !texto;
    el.blocoZoom.hidden = texto;
    el.editor.classList.toggle('modo-texto', texto);
    el.download.textContent = texto ? 'Baixar minha imagem' : 'Baixar minha foto';
    el.download.disabled = !temConteudo();
    if (texto) {
      setStatus('Escreva sua frase, escolha a cor e a moldura, e baixe a imagem.');
    } else {
      setStatus(state.image
        ? 'Arraste para posicionar e use o zoom.'
        : 'Envie uma foto para começar.');
    }
    updateThumbs();
    render();
  }

  function updateThumbs() {
    var photo = temConteudo() ? thumbBackground() : null;
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
    var key = state.modo + '|' + state.fundoId + '|' + state.frase + '|' + state.zoom + '|' +
      state.offsetX + '|' + state.offsetY + '|' + (state.image ? state.image.width : 0);
    if (thumbCache.key === key) return thumbCache.url;
    var c = document.createElement('canvas');
    c.width = c.height = 220;
    var cc = c.getContext('2d');
    if (state.modo === 'texto') {
      drawFundo(cc, 220);
      drawFrase(cc, 220);
    } else {
      cc.fillStyle = state.fundo;
      cc.fillRect(0, 0, 220, 220);
      drawPhoto(cc, 220);
    }
    thumbCache.key = key;
    thumbCache.url = c.toDataURL('image/jpeg', 0.75);
    return thumbCache.url;
  }

  /* ---------------- download ---------------- */

  function download() {
    if (!temConteudo()) return;
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
        a.download = (state.modo === 'texto' ? 'minha-imagem-lula-2026.png' : 'minha-foto-lula-2026.png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        setStatus(state.modo === 'texto'
          ? 'Pronto! Sua imagem foi baixada. Agora é só atualizar seu perfil.'
          : 'Pronto! Sua foto foi baixada. Agora é só atualizar seu perfil.');
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
    el.frase = $('#frase');
    el.fundos = $('#fundos');
    el.blocoFoto = $('#bloco-foto');
    el.blocoFrase = $('#bloco-frase');
    el.blocoZoom = $('#bloco-zoom');
    if (!el.canvas) return;

    el.canvas.width = el.canvas.height = SIZE;
    ctx = el.canvas.getContext('2d');

    state.frase = el.frase.value;
    buildThumbs();
    buildFundos();
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

    $$('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.modo = btn.dataset.mode;
        $$('[data-mode]').forEach(function (b) {
          var ativo = b.dataset.mode === state.modo;
          b.classList.toggle('is-active', ativo);
          b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
        aplicarModo();
      });
    });

    el.frase.addEventListener('input', function () {
      state.frase = el.frase.value;
      el.download.disabled = !temConteudo();
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
