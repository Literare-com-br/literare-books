# Vídeo do smartphone

Adicione aqui o arquivo `literare-phone.mp4` (preferencialmente H.264, orientação vertical). Não foi fornecido um vídeo definitivo; nenhum vídeo substituto foi baixado.

O caminho, enquadramento (`objectPosition`) e descrição acessível ficam em `src/data/phone-media.ts`. O arquivo é detectado pelo Vite e copiado de `public` para o build. Reinicie o servidor ou refaça o build após adicioná-lo.

Quando disponível, o vídeo usa autoplay, muted, loop, playsInline, preload metadata, sem controles ou picture-in-picture. Uma tentativa programática de play trata bloqueio do navegador sem repetir tentativas ou mostrar controles.
