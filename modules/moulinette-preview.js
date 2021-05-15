/*************************
 * Preview
 *************************/
export class MoulinettePreview extends FormApplication {
  
  constructor(asset, pack) {
    super()
    this.asset = asset;   
    this.pack = pack;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-preview",
      classes: ["mtte", "forge", "preview"],
      title: game.i18n.localize("mtte.preview"),
      template: "modules/moulinette-scenes/templates/preview.hbs",
      width: 420,
      height: 600,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() { 
    return { asset: this.asset, pack: this.pack }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    
    html.find("button").click(this._onClick.bind(this))
  }
  
  /*************************************
   * Main action
   ************************************/
  async _onClick(event) {
    event.preventDefault();
    
    ui.scenes.activate() // give focus to scenes
    try {
      // retrieve scene JSON
      const response = await fetch(`${this.asset.baseURL}.json`).catch(function(e) {
        console.log(`Moulinette | Not able to fetch scene JSON`, e)
      });
      if(!response) return ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error');
      const scene = await response.json()
      
      // retrieve and upload scene image
      let proxyImg = null
      let res = await fetch(`${this.asset.baseURL}.webp`).catch(function(e) {
        console.log(`Moulinette | Not able to fetch scene image`, e)
      });
      if(!res) return ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error');
      
      const filename = this.asset.baseURL.split("/").pop() + ".webp"
      const blob = await res.blob()
      const result = await game.moulinette.applications.MoulinetteFileUtil.upload(new File([blob], filename, { type: blob.type, lastModified: new Date() }), filename, "moulinette/scenes", `moulinette/scenes/${this.pack.name}`, false)
      
      // adapt scene and create
      scene.img = result.path
      scene.tiles = []
      scene.sounds = []
      let newScene = await Scene.create(scene);
      let tData = await newScene.createThumbnail()
      await newScene.update({thumb: tData.thumb}); // force generating the thumbnail
      
      ui.notifications.info(game.i18n.localize("mtte.forgingSuccess"), 'success')
    } catch(e) {
      console.log(`Moulinette | Unhandled exception`, e)
      ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
    }
  }
}
