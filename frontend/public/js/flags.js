/* Renderiza emojis (bandeiras) como imagens.
   Windows/Chrome não têm fonte de emoji de bandeira e mostram o código do país
   (BR, US...) no lugar da bandeira. Twemoji troca o emoji por <img> em todo lugar. */
(function () {
  const base = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/';
  const opts = { folder: 'svg', ext: '.svg', base };
  const parse = node => { if (window.twemoji) window.twemoji.parse(node, opts); };

  // ponytail: observa o body inteiro e re-parseia em cada mudança de DOM.
  // App é pequeno; se a renderização ficar pesada, parsear só os containers de jogos.
  let queued = false;
  const obs = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      obs.disconnect();
      parse(document.body);
      obs.observe(document.body, { childList: true, subtree: true });
    });
  });

  const start = () => { parse(document.body); obs.observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
