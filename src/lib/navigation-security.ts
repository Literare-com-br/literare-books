export function safeDashboardNext(value: string | null) {
  return value && /^\/dashboard(?:\/(?:coautorias|contatos|catalogo|conteudo|relatorios|usuarios|configuracoes))?$/.test(value) ? value : '/dashboard';
}
