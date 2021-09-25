
/*************************
 * Export a scene
 *************************/
export class MoulinetteExport extends FormApplication {
  
  constructor(scene) {
    super()
    this.scene = scene;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-export",
      classes: ["mtte", "export"],
      title: game.i18n.localize("mtte.export"),
      template: "modules/moulinette-scenes/templates/export.hbs",
      width: 400,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    return { sceneName: this.scene.name };
  }


  
  async _updateObject(event, inputs) {
    event.preventDefault();

    if(!inputs.sceneName || inputs.sceneName.length == 0) {
      return ui.notifications.error(game.i18n.localize("mtte.errorMandatorySceneName"));
    }

    const sceneName = inputs.sceneName
    const sceneNameClean = sceneName.replace(/ /g, "-").replace(/[^\w-_]+/g, '')
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const FOLDER = "moulinette/output/creatorName-packName"
    const SUBFOLDER = FOLDER + "/deps"

    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.exporting"), 0);

    // regenerate thumbnail
    let thumb
    try {
      thumb = await this.scene.createThumbnail({width:400, height:400})
      const blob = FILEUTIL.b64toBlob(thumb.thumb)
      await FILEUTIL.uploadFile(new File([blob], sceneNameClean + ".png", { type: blob.type, lastModified: new Date() }), sceneNameClean + ".png", FOLDER, false)
    } catch(e) {
      console.error(e)
      return ui.notifications.error(game.i18n.localize("mtte.errorThumbnailGeneration"));
    }

    // remove tokens (won't work)
    this.scene.data.tokens = []

    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.exporting"), 0);

    // export as JSON & detect potential paths
    const paths = new Set();
    let jsonData = JSON.stringify(this.scene)
    const regex = new RegExp('"([^"]+/[^"]+)"', "g")
    const matches = jsonData.matchAll(regex)
    if(matches) {
      for(const m of matches) {
        if(m[1].indexOf(".") > -1) {
          paths.add(m[1])
        }
      }
    }

    // upload all assets
    let idx = 0
    for(const path of paths) {
      idx++
      const filename = path.split("/").pop()
      const filepath = SUBFOLDER + "/" + filename
      const success = await FILEUTIL.downloadFile(path, SUBFOLDER, decodeURIComponent(filename))
      if(!success) {
        console.warn(`MoulinetteExport | '${path}' doesn't seem to be a valid path!`)
        continue
      }
      jsonData = jsonData.replaceAll(path, "#DEP#" + decodeURIComponent(`deps/${filename}`))
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.exporting"), Math.round((idx / paths.length)*100));
    }

    // upload JSON
    const jsonFile = sceneNameClean + ".json"
    await FILEUTIL.uploadFile(new File([jsonData], jsonFile, { type: "application/json", lastModified: new Date() }), jsonFile, FOLDER, true)

    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.exporting"), 100);
  }
}
