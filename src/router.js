export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentLayout = null;
    this.currentComponent = null;

    this.init();
  }

  init() {
    this.handleDOMContentLoaded();
    this.initNavigation();
    this.handlePopstate();
  }

  handleDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", async () => {
      const url = window.location.pathname;
      console.log(url);
      await this.resolvePath(url);
    });
  }

  initNavigation() {
    document.addEventListener("click", async (event) => {
      const link = event.target.closest("[data-spa-link]");
      if (link) {
        event.preventDefault();
        const url = link.getAttribute("href");
        history.pushState(null, null, url);
        await this.resolvePath(url);
      }
    });
  }

  handlePopstate() {
    window.addEventListener("popstate", async () => {
      const url = window.location.pathname;
      await this.resolvePath(url);
    });
  }

  _matchRoute(routePath, url) {
    const paramNames = [];
    const regexPath = routePath.replace(/:([^\/]+)/g, (match, paramName) => {
      paramNames.push(paramName);
      return '([^\/]+)';
    });

    const regex = new RegExp(`^${regexPath}$`);
    const match = url.match(regex);

    if (!match) return null;

    const params = {};
    match.slice(1).forEach((value, index) => params[paramNames[index]] = value);
    return params;
  }

  async resolvePath(url) {
    let route = null;
    let params = {};

    for (const path in this.routes) {
      const matchedParams = this._matchRoute(path, url);
      if (matchedParams) {
        route = this.routes[path];
        params = matchedParams;
        break;
      }
    }

    if (!route) {
      console.log("404");
      // отрисовка страницы 404
    }

    if (!this.currentLayout || route.Layout !== this.currentLayout.constructor) {
      if (this.currentLayout) {
        this.currentLayout.destroy();
      }
      this.currentLayout = new route.Layout();
      await this.currentLayout.draw();

      if (this.currentComponent) this.currentComponent.destroy();
    }

    if (route.Component && (!this.currentComponent || this.currentComponent.constructor !== route.Component)) {
      if (this.currentComponent) this.currentComponent.destroy();

      this.currentComponent = new route.Component(params);
      await this.currentComponent.draw();
    } else if (!route.Component) {
      if (this.currentComponent) this.currentComponent.destroy();
      this.currentComponent = null;
    }
  }
}

