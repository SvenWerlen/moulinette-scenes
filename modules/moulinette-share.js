import { MoulinettePreview } from "./moulinette-preview.js"

/*************************
 * Share
 *************************/
export class MoulinetteShare extends FormApplication {
  
  constructor(scene) {
    super()
    this.scene = scene;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-share",
      classes: ["mtte", "share"],
      title: game.i18n.localize("mtte.share"),
      template: "modules/moulinette-scenes/templates/share.hbs",
      width: 880,
      height: 500,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const authorImg = game.settings.get("moulinette", "shareImgAuthor")
    const discordId = game.settings.get("moulinette", "shareDiscordId") 
    return { sceneName: this.scene.name, authorImg: authorImg != "undefined" ? authorImg : "", discordId: discordId != "undefined" ? discordId : "" };
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    
    html.find("input.sceneName").on("keyup", function() { html.find("#scenePacks .sceneName").text($(this).val()) })
    html.find("input.sceneDesc").on("keyup", function() { html.find("#scenePacks .pack").attr('title',$(this).val()) })
    html.find("input.authorImg").on("keyup", function() { html.find("#scenePacks .authorImg").text($(this).val()) })
    html.find("input.authorURL").on("keyup", function() { html.find("#scenePacks .authorImg").attr('href',$(this).val()) })
    html.find("input.imageURL").on("keyup", function() { html.find("#scenePacks .preview").attr('data-id', $(this).val()) })
    html.find(".preview").click(this._onPreview.bind(this));
  }
  
  _onPreview(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const sceneURL = source.dataset.id;
    const thumbURL = sceneURL
    new MoulinettePreview({ thumb: thumbURL, resize: true}).render(true)
  }
  
  async _updateObject(event, inputs) {
    event.preventDefault();
    if(!inputs.sceneName || inputs.sceneName.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorMandatorySceneName"));
    }
    else if(!inputs.sceneDesc || inputs.sceneDesc.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorMandatorySceneDesc"));
    }
    else if(!inputs.authorImg || inputs.authorImg.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorAuthorImg"));
    }
    else if(!inputs.authorURL || inputs.authorURL.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorAuthorURL"));
    }
    else if(!inputs.imageURL || inputs.imageURL.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorImageURL"));
    }
    else if(!inputs.agree1 || !inputs.agree2) {
      return ui.notifications.error(game.i18n.localize("mtte.errorMustAgree"));
    }
    else if(!inputs.discordId || inputs.discordId.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorDiscordId"));
    }
    
    // store settings
    game.settings.set("moulinette", "shareImgAuthor", inputs.authorImg)
    game.settings.set("moulinette", "shareDiscordId", inputs.discordId)  
    
    // cleanup data before sending
    let data = this.scene.data
    delete data.thumb
    delete data._priorThumbPath
    
    // submit contribution
    let client = new game.moulinette.applications.MoulinetteClient()
    const result = await client.post(`/bundler/fvtt/scene`, {
      guid: game.settings.get("moulinette", "userId"),
      scene: this.scene,
      sceneName: inputs.sceneName,
      sceneDesc: inputs.sceneDesc,
      authorImg: `${inputs.authorImg}|${inputs.authorURL}`,
      imageURL: inputs.imageURL,
      discordId: inputs.discordId
    })
    if(result.status != 200) {
      console.log("Moulinette Scenes | Sharing failed with error: " + result.data.error)
      return ui.notifications.error(game.i18n.localize("mtte.errorUnexpected"));
    } else {
      ui.notifications.info(game.i18n.localize("mtte.shareSuccess"));
      this.close()
      return;
    }
  }
  
}
