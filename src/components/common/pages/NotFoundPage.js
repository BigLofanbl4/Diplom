import { getPanelBasePath } from "../../../utils/panelRoute.js";

export default class NotFoundPage {
  async draw() {
    document.getElementById("app").innerHTML = `
      <div class="not-found">
        <div class="not-found__badge">404</div>
        <h1 class="not-found__title">Страница не найдена</h1>
        <p class="not-found__text">Похоже, адрес устарел или был введен с ошибкой.</p>
        <a href="${getPanelBasePath()}" class="btn btn-primary" data-spa-link>Вернуться в рабочую панель</a>
      </div>
    `;
  }

  destroy() {}
}
