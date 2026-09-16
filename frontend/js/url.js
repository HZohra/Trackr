/* Reading a parameter out of the page URL. */

export function getParam(name) {
  const fromQuery = new URLSearchParams(location.search).get(name);
  if (fromQuery) return fromQuery;
  // location.hash keeps its leading "#"; the rest parses like a query string.
  const fromHash = new URLSearchParams(location.hash.slice(1)).get(name);
  return fromHash || null;
}

// Build a link to a page param using the hash form, so it survives the redirect.
export const paramLink = (page, name, value) =>
  `${page}#${name}=${encodeURIComponent(value)}`;
