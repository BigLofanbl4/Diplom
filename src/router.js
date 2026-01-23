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
    document.addEventListener("DOMContentLoaded", () => {
      const url = window.location.pathname;
      console.log(url);
      this.resolvePath(url);
    });
  }

  initNavigation() {
    document.addEventListener("click", (event) => {
      if (event.target.hasAttribute("data-spa-link")) {
        event.preventDefault();
        const url = event.target.getAttribute("href");
        history.pushState(null, null, url);
        this.resolvePath(url);
      }
    });
  }

  handlePopstate() {
    window.addEventListener("popstate", () => {
      const url = window.location.pathname;
      this.resolvePath(url);
    });
  }

  resolvePath(url) {
    const route = this.routes[url];
    if (!route) {
      console.log("404");
      // отрисовка страницы 404
    }

    if (!this.currentLayout || route.Layout !== this.currentLayout.constructor) {
      if (this.currentLayout) this.currentLayout.destroy();

      this.currentLayout = new route.Layout();
      this.currentLayout.draw();

      if (this.currentComponent) this.currentComponent.destroy();
    }

    if (route.Component && (!this.currentComponent || this.currentComponent.constructor !== route.Component)) {
      if (this.currentComponent) this.currentComponent.destroy();

      this.currentComponent = new route.Component();
      this.currentComponent.draw();
    }
  }
}

