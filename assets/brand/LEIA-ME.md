# Kit da campanha — o que colocar aqui

Esta pasta recebe os arquivos oficiais da campanha. Enquanto ela estiver vazia,
o site usa a identidade genérica (estrela própria, vermelho/amarelo próprios e
fonte do sistema).

## Arquivos esperados

### 1. Logotipo — `assets/brand/logo.svg`

- **SVG** é o ideal (escala sem perder qualidade e entra direto nas molduras).
- Se só houver PNG, use fundo transparente e pelo menos 1080 px no lado maior,
  salvo como `logo.png`.
- Se o kit trouxer a versão monocromática branca (para fundo vermelho/escuro),
  salve também como `logo-branco.svg`.

### 2. Fontes — `assets/brand/fonts/`

- Formato ideal: **`.woff2`** (é o que o navegador carrega mais rápido).
- `.ttf` ou `.otf` também servem — eu converto para `.woff2` na integração.
- Envie os pesos que o manual usar (normalmente regular, bold e black/extrabold).
- Nome sugerido: `NomeDaFonte-Black.woff2`, `NomeDaFonte-Bold.woff2` etc.

### 3. Paleta — `assets/brand/paleta.txt` (opcional)

Os códigos hex do manual de marca, um por linha, por exemplo:

    vermelho  #C4122F
    amarelo   #FFCC29

Sem isso eu extraio as cores do próprio logotipo.

## Como me entregar

Qualquer um destes serve:

1. Commitar os arquivos nesta pasta na branch `main` e me avisar.
2. Me mandar o link público do kit de apoiador, que eu baixo.
3. Anexar os arquivos direto na conversa.

## O que eu faço com eles

- Carrego a fonte via `@font-face` e troco a pilha de fontes do site e das
  molduras (hoje tudo cai em Arial/fonte do sistema).
- Ajusto a paleta em `assets/css/style.css` e em `assets/js/frames.js`.
- Crio uma moldura nova com o logotipo, mantendo as genéricas para quem
  preferir.

## Licença

Use apenas material que a campanha distribua para apoiadores (ou que você tenha
autorização para usar). Os arquivos colocados aqui vão para um repositório
público e ficam servidos no site.
