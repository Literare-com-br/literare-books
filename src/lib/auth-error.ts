export function loginError(error?: { code?: string; status?: number; name?: string } | null) {
  if (error?.code === 'email_provider_disabled') return 'O login por e-mail está desativado. Entre em contato com o responsável pelo site.';
  if (error?.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
  if (error?.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  if (error?.status === 0 || error?.name === 'AuthRetryableFetchError') return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
  return 'Não foi possível entrar. Confira seu e-mail e sua senha.';
}
