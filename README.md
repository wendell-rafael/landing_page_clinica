# Filtro Lula — moldura para foto de perfil

Site estático que permite ao apoiador colocar uma moldura de campanha na própria
foto de perfil e baixar a imagem pronta para redes sociais — no mesmo espírito de
ferramentas como o `filtro.renanpresidente.com`.

**Nenhuma imagem é enviada para servidor:** todo o recorte e a montagem acontecem
no navegador do usuário, via HTML5 Canvas.

## Funcionalidades

- Envio de foto por botão, arrastar e soltar ou colar (Ctrl+V)
- Reposicionamento arrastando a foto, zoom por slider, roda do mouse ou pinça (2 dedos)
- 3 formatos de recorte: redondo, arredondado e quadrado
- 6 molduras + opção "sem moldura", todas geradas em SVG na hora
- Texto da moldura editável (ex.: `LULA 2026`, `#LulaPresidente`, nome do estado)
- Download em PNG 1080×1080
- Landing page completa: hero, passo a passo, editor, compartilhamento e dúvidas
- Responsivo (celular e desktop) e sem dependências externas

## Estrutura

```
index.html                     # landing page + editor
404.html                       # página de endereço inexistente
assets/css/style.css           # estilos
assets/js/frames.js            # molduras (SVG 1080x1080 geradas por código)
assets/js/app.js               # editor: upload, enquadramento, zoom e download
.github/workflows/pages.yml    # publica o site na branch gh-pages
```

## Como rodar

É um site estático, sem build. Basta abrir o `index.html` ou servir a pasta:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Publicação

O site está no ar em:

    https://wendell-rafael.github.io/landing_page_clinica/

O GitHub Pages serve a branch `gh-pages`, que contém apenas `index.html`,
`assets/` e `.nojekyll`. O workflow `.github/workflows/pages.yml` atualiza essa
branch automaticamente a cada push na `main` — ou seja, basta trabalhar na
`main` normalmente.

Também funciona em qualquer outra hospedagem estática (Netlify, Vercel,
Cloudflare Pages): basta apontar para a raiz do repositório, sem build.

## Como adicionar uma nova moldura

Em `assets/js/frames.js`, acrescente um item ao array `FRAMES`:

```js
{
  id: 'minha-moldura',
  nome: 'Minha moldura',
  descricao: 'Descrição curta',
  texto: 'LULA 2026',              // null = moldura sem texto editável
  render: function (shape, texto) { // shape: 'circulo' | 'arredondado' | 'quadrado'
    return svg(shapeStroke(shape, 0, 40, COLORS.vermelho) + pill(shape, texto));
  }
}
```

Os utilitários `shapeStroke`, `clipDef`, `band`, `safeWidth`, `textEl`, `starEl` e
`pill` já respeitam a geometria de cada formato, garantindo que faixas e textos
nunca escapem da área visível da foto.

## Aviso

Projeto independente, feito por apoiadores, sem vínculo oficial com candidatos,
partidos ou órgãos eleitorais. As molduras usam elementos gráficos genéricos
(estrela, cores) e não reproduzem logotipos registrados.
