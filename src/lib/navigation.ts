export function institutionalHref(href: string, pathname: string) {
  return href.startsWith('#') && pathname !== '/' ? `/${href}` : href;
}
