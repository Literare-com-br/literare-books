# Imagens institucionais da seção Sobre

Adicione os três PNGs finais nesta pasta, com os nomes exatos:

- `sobre-literare-01.png` — Histórias que merecem ser contadas.
- `sobre-literare-02.png` — Do original ao livro.
- `sobre-literare-03.png` — Conhecimento que ultrapassa páginas.

Os caminhos públicos são `/images/sobre/sobre-literare-01.png`, `/images/sobre/sobre-literare-02.png` e `/images/sobre/sobre-literare-03.png`.

Nenhuma imagem substituta foi incluída. Enquanto um arquivo estiver ausente, seu card apresenta somente o conteúdo institucional, sem imagem quebrada ou foto externa. Após adicionar os arquivos, reinicie `npm run dev`; para produção, gere um novo build. A detecção dos arquivos ocorre na configuração do Vite, como a dos vídeos locais existentes.

A área de imagem usa `object-fit: contain`, `object-position: center center` e alinhamento central nos dois eixos. PNGs de proporções diferentes preservam suas dimensões e transparência. Recorte margens transparentes excessivas no arquivo de origem se a composição visual ficar deslocada; o alinhamento considera a área completa do PNG. Atualize o texto alternativo em `src/sections/AboutSection.tsx` se necessário para descrever o conteúdo final.
