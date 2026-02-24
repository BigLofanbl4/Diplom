export function matchRoute(routePath, pathname) {
  const paramNames = [];
  const regexPath = routePath.replace(/:([^/]+)/g, (_match, paramName) => {
    paramNames.push(paramName);
    return "([^/]+)";
  });

  const regex = new RegExp(`^${regexPath}$`);
  const match = pathname.match(regex);
  if (!match) return null;

  const params = {};
  match.slice(1).forEach((value, index) => {
    params[paramNames[index]] = value;
  });
  return params;
}
