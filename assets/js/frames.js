/*
 * frames.js — Molduras (frames) do Filtro Lula
 * Cada moldura é gerada como um SVG 1080x1080 em tempo de execução, o que
 * evita depender de arquivos externos e mantém o canvas exportável (sem taint).
 *
 * Toda a tipografia e as faixas são posicionadas a partir da geometria do
 * formato escolhido (círculo, arredondado ou quadrado), para que nada
 * escape da área visível da foto.
 */
(function (global) {
  'use strict';

  var SIZE = 1080;
  var C = SIZE / 2;

  var COLORS = {
    vermelho: '#C4122F',
    vermelhoEscuro: '#8E0C22',
    amarelo: '#FFCC29',
    verde: '#009C3B',
    azul: '#002776',
    branco: '#FFFFFF'
  };

  var FONT = "'Archivo Black','Arial Black','Helvetica Neue',Arial,sans-serif";
  var CHAR = 0.64; // largura média do caractere (em relação ao corpo da fonte)

  /* ---------------- helpers ---------------- */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function starPoints(cx, cy, outer, inner, rotation) {
    var rot = (rotation || 0) * Math.PI / 180 - Math.PI / 2;
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = rot + (i * Math.PI) / 5;
      pts.push((cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  function starEl(cx, cy, outer, fill, rotation) {
    return '<polygon points="' + starPoints(cx, cy, outer, outer * 0.42, rotation) + '" fill="' + fill + '"/>';
  }

  function shapeBody(shape, inset) {
    var i = inset || 0;
    if (shape === 'circulo') return '<circle cx="' + C + '" cy="' + C + '" r="' + (C - i) + '"/>';
    return '<rect x="' + i + '" y="' + i + '" width="' + (SIZE - i * 2) + '" height="' + (SIZE - i * 2) +
      '" rx="' + (shape === 'arredondado' ? 96 : 0) + '"/>';
  }

  function clipDef(shape, id) {
    return '<clipPath id="' + id + '">' + shapeBody(shape) + '</clipPath>';
  }

  function shapeStroke(shape, inset, width, stroke) {
    var i = inset + width / 2;
    var attrs = ' fill="none" stroke="' + stroke + '" stroke-width="' + width + '"';
    if (shape === 'circulo') return '<circle cx="' + C + '" cy="' + C + '" r="' + (C - i) + '"' + attrs + '/>';
    return '<rect x="' + i + '" y="' + i + '" width="' + (SIZE - i * 2) + '" height="' + (SIZE - i * 2) +
      '" rx="' + (shape === 'arredondado' ? 96 : 0) + '"' + attrs + '/>';
  }

  // Onde a faixa/selo fica em cada formato
  function band(shape) {
    if (shape === 'circulo') return { cy: 824, h: 132 };
    if (shape === 'arredondado') return { cy: 946, h: 140 };
    return { cy: 958, h: 140 };
  }

  // Largura útil na altura da faixa, respeitando o recorte do formato
  function safeWidth(shape, cy, h, inset) {
    var i = inset == null ? 36 : inset;
    if (shape === 'circulo') {
      var dy = Math.max(Math.abs(cy - h / 2 - C), Math.abs(cy + h / 2 - C));
      var r = C - i;
      return 2 * Math.sqrt(Math.max(0, r * r - dy * dy));
    }
    return SIZE - 2 * (i + (shape === 'arredondado' ? 60 : 40));
  }

  /*
   * Texto que nunca estoura: o corpo da fonte é calculado para caber na
   * largura disponível e `textLength` garante o encaixe exato na renderização.
   */
  function textEl(t, cx, cy, maxWidth, baseSize, fill, extra) {
    if (!t) return { svg: '', width: 0 };
    var fs = Math.min(baseSize, maxWidth / (t.length * CHAR));
    fs = Math.max(24, fs);
    var w = Math.min(maxWidth, t.length * fs * CHAR);
    return {
      width: w,
      fontSize: fs,
      svg: '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" text-anchor="middle" dominant-baseline="central"' +
        ' font-family="' + FONT + '" font-size="' + fs.toFixed(1) + '" font-weight="900" fill="' + fill + '"' +
        ' textLength="' + w.toFixed(1) + '" lengthAdjust="spacingAndGlyphs"' + (extra || '') + '>' + t + '</text>'
    };
  }

  // Selo em formato de pílula, com estrela à esquerda e texto à direita
  function pill(shape, t, opts) {
    if (!t) return '';
    opts = opts || {};
    var g = band(shape);
    var h = opts.h || g.h;
    var cy = opts.cy || g.cy;
    var maxW = safeWidth(shape, cy, h, opts.inset);
    var padX = h * 0.42;
    var starR = h * 0.32;
    var starZone = opts.star === false ? 0 : starR * 2 + h * 0.20;
    var textMax = Math.max(120, maxW - padX * 2 - starZone);
    var txt = textEl(t, 0, 0, textMax, opts.base || h * 0.56, COLORS.branco);
    var w = Math.min(maxW, padX * 2 + starZone + txt.width);
    var x = C - w / 2;
    var textCx = x + padX + starZone + (w - padX * 2 - starZone) / 2;

    var out = '<rect x="' + x.toFixed(1) + '" y="' + (cy - h / 2).toFixed(1) + '" width="' + w.toFixed(1) +
      '" height="' + h + '" rx="' + (h / 2) + '" fill="' + (opts.fill || COLORS.vermelho) + '"' +
      (opts.stroke ? ' stroke="' + opts.stroke + '" stroke-width="8"' : '') + '/>';
    if (opts.star !== false) out += starEl(x + padX + starR, cy, starR, opts.starColor || COLORS.amarelo);
    out += textEl(t, textCx, cy, textMax, opts.base || h * 0.56, COLORS.branco).svg;
    return out;
  }

  function svg(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + SIZE + '" height="' + SIZE +
      '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '">' + inner + '</svg>';
  }

  /* ---------------- molduras ---------------- */

  var FRAMES = [
    {
      id: 'nenhuma',
      nome: 'Sem moldura',
      descricao: 'Apenas o recorte da foto',
      texto: null,
      render: function () { return svg(''); }
    },

    {
      id: 'estrela',
      nome: 'Estrela',
      descricao: 'Borda vermelha com selo e estrela',
      texto: 'LULA 2026',
      render: function (shape, texto) {
        var t = esc((texto || '').toUpperCase());
        return svg(
          shapeStroke(shape, 0, 52, COLORS.vermelho) +
          shapeStroke(shape, 52, 10, COLORS.branco) +
          pill(shape, t, { stroke: COLORS.branco })
        );
      }
    },

    {
      id: 'esperanca',
      nome: 'Esperança',
      descricao: 'Degradê vermelho e amarelo',
      texto: '#LulaPresidente',
      render: function (shape, texto) {
        var t = esc(texto || '');
        var g = band(shape);
        var top = g.cy - g.h / 2 - 26;
        var maxW = safeWidth(shape, g.cy, g.h, 40);
        return svg(
          '<defs>' +
          '<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0%" stop-color="' + COLORS.amarelo + '"/>' +
          '<stop offset="55%" stop-color="' + COLORS.vermelho + '"/>' +
          '<stop offset="100%" stop-color="' + COLORS.vermelhoEscuro + '"/>' +
          '</linearGradient>' +
          clipDef(shape, 'c2') +
          '</defs>' +
          '<g clip-path="url(#c2)">' +
          '<rect x="0" y="' + top + '" width="' + SIZE + '" height="' + (SIZE - top) + '" fill="url(#g1)" opacity="0.94"/>' +
          starEl(C, top - 46, 48, COLORS.amarelo) +
          textEl(t, C, g.cy, maxW, 84, COLORS.branco).svg +
          '</g>' +
          shapeStroke(shape, 0, 46, 'url(#g1)')
        );
      }
    },

    {
      id: 'bandeira',
      nome: 'Bandeira',
      descricao: 'Cores do Brasil na borda',
      texto: 'BRASIL DA ESPERANÇA',
      render: function (shape, texto) {
        var t = esc((texto || '').toUpperCase());
        var g = band(shape);
        var top = g.cy - g.h / 2;
        var maxW = safeWidth(shape, g.cy, g.h, 40);
        return svg(
          '<defs>' +
          '<linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="' + COLORS.verde + '"/>' +
          '<stop offset="33%" stop-color="' + COLORS.amarelo + '"/>' +
          '<stop offset="66%" stop-color="' + COLORS.vermelho + '"/>' +
          '<stop offset="100%" stop-color="' + COLORS.azul + '"/>' +
          '</linearGradient>' +
          clipDef(shape, 'c3') +
          '</defs>' +
          '<g clip-path="url(#c3)">' +
          '<rect x="0" y="' + top + '" width="' + SIZE + '" height="' + g.h + '" fill="' + COLORS.vermelho + '"/>' +
          '<rect x="0" y="' + top + '" width="' + SIZE + '" height="14" fill="' + COLORS.amarelo + '"/>' +
          textEl(t, C, g.cy + 6, maxW, 64, COLORS.branco).svg +
          '</g>' +
          shapeStroke(shape, 0, 40, 'url(#g3)') +
          shapeStroke(shape, 40, 12, COLORS.branco)
        );
      }
    },

    {
      id: 'faixa',
      nome: 'Faixa',
      descricao: 'Fita diagonal no canto',
      texto: 'LULA 2026',
      render: function (shape, texto) {
        var t = esc((texto || '').toUpperCase());
        // A fita corta o canto inferior esquerdo: no círculo ela precisa passar
        // mais perto do centro para ter comprimento útil.
        var redondo = shape === 'circulo';
        var px = redondo ? 307 : 232;
        var py = redondo ? 773 : 852;
        var maxW = redondo ? 640 : 470;
        var estrela = redondo ? SIZE - 258 : SIZE - 196;
        return svg(
          '<defs>' + clipDef(shape, 'c4') + '</defs>' +
          '<g clip-path="url(#c4)">' +
          '<g transform="rotate(45 ' + px + ' ' + py + ')">' +
          '<rect x="' + (px - 900) + '" y="' + (py - 70) + '" width="1800" height="140" fill="' + COLORS.vermelho + '"/>' +
          '<rect x="' + (px - 900) + '" y="' + (py - 70) + '" width="1800" height="12" fill="' + COLORS.amarelo + '"/>' +
          textEl(t, px, py + 4, maxW, 74, COLORS.branco).svg +
          '</g>' +
          starEl(estrela, SIZE - estrela, 70, COLORS.vermelho) +
          starEl(estrela, SIZE - estrela, 30, COLORS.amarelo) +
          '</g>'
        );
      }
    },

    {
      id: 'onda',
      nome: 'Onda',
      descricao: 'Base curva com estrela',
      texto: 'EU APOIO',
      render: function (shape, texto) {
        var t = esc((texto || '').toUpperCase());
        var g = band(shape);
        var top = g.cy - g.h / 2 - 40;
        var wave = function (y, fill, opacity) {
          return '<path d="M0,' + y + ' C 270,' + (y - 96) + ' 540,' + (y + 84) + ' 810,' + (y - 16) +
            ' C 930,' + (y - 62) + ' 1010,' + (y - 46) + ' 1080,' + (y - 22) + ' L1080,' + SIZE + ' L0,' + SIZE +
            ' Z" fill="' + fill + '"' + (opacity ? ' opacity="' + opacity + '"' : '') + '/>';
        };
        return svg(
          '<defs>' + clipDef(shape, 'c5') + '</defs>' +
          '<g clip-path="url(#c5)">' +
          wave(top, COLORS.vermelhoEscuro, '0.95') +
          wave(top + 46, COLORS.vermelho) +
          pill(shape, t, { fill: 'none', cy: g.cy + 22 }) +
          '</g>' +
          shapeStroke(shape, 0, 28, COLORS.vermelho)
        );
      }
    },

    {
      id: 'cantos',
      nome: 'Minimalista',
      descricao: 'Detalhes discretos nos cantos',
      texto: 'LULA',
      render: function (shape, texto) {
        var t = esc((texto || '').toUpperCase());
        var arcs = shape === 'circulo'
          ? '<circle cx="' + C + '" cy="' + C + '" r="' + (C - 26) + '" fill="none" stroke="' + COLORS.vermelho +
            '" stroke-width="30" stroke-linecap="round" stroke-dasharray="520 320" stroke-dashoffset="260"/>'
          : '<g fill="none" stroke="' + COLORS.vermelho + '" stroke-width="30" stroke-linecap="square">' +
            '<path d="M26,246 L26,26 L246,26"/><path d="M834,26 L1054,26 L1054,246"/>' +
            '<path d="M1054,834 L1054,1054 L834,1054"/><path d="M246,1054 L26,1054 L26,834"/></g>';
        return svg(arcs + pill(shape, t, { h: 104, base: 58, inset: shape === 'circulo' ? 36 : 130 }));
      }
    }
  ];

  global.LulaFrames = {
    SIZE: SIZE,
    COLORS: COLORS,
    list: FRAMES,
    byId: function (id) {
      for (var i = 0; i < FRAMES.length; i++) if (FRAMES[i].id === id) return FRAMES[i];
      return FRAMES[0];
    },
    toDataUrl: function (frame, shape, texto) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(frame.render(shape, texto));
    }
  };
})(window);
