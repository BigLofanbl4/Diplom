export default class CardListComponent {
  constructor( template, cardsContainerId, cardRenderer, emptyListTitle = "" ) {
    this.template = template;
    this.cardsData = { data: [] };
    this.cardRenderer = cardRenderer;
    this.cardsHTML = "";
    this.cardsContainerId = cardsContainerId;
    this.cardsContainer = null;
    this.listContainer = null;
    this.emptyListTitle = emptyListTitle;
    this.cardInstances = [];
  }

  render() {
    if (this.cardsData.data.length === 0) {
      this.cardsHTML = "";
      this.cardInstances = [];
      return;
    }

    const rendered = this.cardsData.data.map(c => this.cardRenderer(c));

    if (typeof(rendered[0]) === "string") {
      this.cardInstances = [];
      this.cardsHTML = rendered.join("");
      return;
    }

    this.cardInstances = rendered;
    this.cardsHTML = rendered.map(c => c.render()).join("");
  }

  mount() {
    const componentContainer = document.getElementById("component");
    componentContainer.insertAdjacentHTML("beforeend", this.template);

    this.cardsContainer = componentContainer.querySelector(`#${this.cardsContainerId}`);
    if (!this.cardsContainer) return;

    this.listContainer = this.cardsContainer.closest(".cards")
    this.cardsContainer.innerHTML = this.cardsHTML;

    if (this.cardsContainer.innerHTML === "") {
      this.cardsContainer.innerHTML = `
        <h3 class="cards__list-empty-title">
            ${this.emptyListTitle ? this.emptyListTitle : "Список пуст"}
        </h3>
      `;
    }

    if (this.cardInstances.length > 0) {
      const children = Array.from(this.cardsContainer.children);
      this.cardInstances.forEach((card, index) => card.bindEvents(children[index]));
    }
  }

  destroy() {
    if (this.listContainer) this.listContainer.remove();
    this.cardInstances = [];
    this.listContainer = null;
    this.cardsContainer = null;
  }
}
