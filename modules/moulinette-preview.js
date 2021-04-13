/*************************
 * Preview
 *************************/
export class MoulinettePreview extends FormApplication {
  
  constructor(data) {
    super()
    this.data = data;    
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-preview",
      classes: ["mtte", "preview"],
      title: game.i18n.localize("mtte.preview"),
      template: "modules/moulinette-scenes/templates/preview.hbs",
      width: 420,
      height: 470,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() { 
    return this.data
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find(".thumb").css('background', `url(${this.data.thumb}) 50% 50% no-repeat`)
    const window = this;
    html.click(function() { window.close() });
  }
}
