
/*************************
 * Export a scene
 *************************/
export class MoulinetteLocalExport extends FormApplication {

  constructor(scene, folder) {
    super()
    this.scene = scene;
    this.folder = folder;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-export",
      classes: ["mtte", "export"],
      title: game.i18n.localize("mtte.localexport"),
      template: "modules/moulinette-scenes/templates/exportlocal.hbs",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  async getData() {
    if(this.scene) {
      const folders = MoulinetteLocalExport.getFolderPath(this.scene.folder)
      return { sceneName: this.scene.name, sceneFolder: folders.length > 0 ? folders : "-" };
    } else {
      const folders = MoulinetteLocalExport.getFolderPath(this.folder)
      return { sceneFolder: folders };
    }
  }


  /**
   * Returns the folder paths recursively
   */
  static getFolderPath(folder) {
    if(!folder) {
      return ""
    }

    if(folder.parent) {
      const parent = game.folders.get(folder.parent)
      if( parent ) {
        return MoulinetteLocalExport.getFolderPath(parent) + "/" + folder.name
      }
    }
    return folder.name
  }

  /**
   * Returns all the scenes from folder
   */
   static getScenesFromFolder(folder) {
    let scenes = game.scenes.filter(sc => sc.folder && sc.folder.id == folder.id)
    for(const child of folder.children) {
      if(child.folder) {
        scenes = scenes.concat(MoulinetteLocalExport.getScenesFromFolder(child.folder))
      }
    }
    return scenes;
  }

  /**
   * Exports a scene into `moulinette/export` folder
   */
  static async exportScene(scene, sceneName, type, exportAll = false) {
    const sceneNameClean = sceneName.replace(/ /g, "-").replace(/[^\w-_]+/g, '')
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const FOLDER = "moulinette/export/creatorName-packName"
    const SUBFOLDER = FOLDER + "/deps"

    const sceneFolders = MoulinetteLocalExport.getFolderPath(scene.folder)
    const scenePath = type == "flat" || sceneFolders.length == 0 ? FOLDER : `${FOLDER}/${sceneFolders}`

    // regenerate thumbnail
    let thumb
    try {
      thumb = await scene.createThumbnail({width:400, height:400})
      const blob = FILEUTIL.b64toBlob(thumb.thumb)
      await FILEUTIL.uploadFile(new File([blob], sceneNameClean + "_thumb.png", { type: blob.type, lastModified: new Date() }), sceneNameClean + "_thumb.png", scenePath, false)
    } catch(e) {
      console.error(e)
      return ui.notifications.error(game.i18n.localize("mtte.errorThumbnailGeneration"));
    }

    // remove tokens (won't work) and thumb (will be regenerated)
    scene = duplicate(scene)
    scene.tokens = []
    delete(scene.thumb)

    // export as JSON & detect potential paths
    const paths = new Set();
    let jsonData = JSON.stringify(scene)
    const regex = new RegExp('"([^"]+/[^"]+)"', "g")
    const matches = jsonData.matchAll(regex)
    if(matches) {
      for(const m of matches) {
        if(m[1].indexOf(".") > -1) {
          // export modules/ and systems
          if(exportAll || (!m[1].startsWith("modules/") && !m[1].startsWith("systems/"))) {
            paths.add(m[1])
          }
        }
      }
    }

    // upload all assets
    let idx = 0
    for(const path of paths) {
      idx++
      let filename = path.split("/").pop()
      const filepath = SUBFOLDER + "/" + filename
      const success = await FILEUTIL.downloadFile(path, SUBFOLDER, decodeURIComponent(filename))
      if(!success) {
        console.warn(`MoulinetteLocalExport | '${path}' doesn't seem to be a valid path!`)
        continue
      }
      // images get converted to WEBP
      if(filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
        filename = filename.substring(0, filename.lastIndexOf(".")) + ".webp"
      }
      jsonData = jsonData.replaceAll(path, "#DEP#" + decodeURIComponent(`deps/${filename}`))
    }

    // upload JSON
    const jsonFile = sceneNameClean + ".json"
    await FILEUTIL.uploadFile(new File([jsonData], jsonFile, { type: "application/json", lastModified: new Date() }), jsonFile, scenePath, true)
  }


  async _updateObject(event, inputs) {
    event.preventDefault();

    const type = event.submitter.classList.contains("flat") ? "flat" : "expanded"
    const exportAll = inputs.exportAll

    const progressbar = (new game.moulinette.applications.MoulinetteProgress(game.i18n.localize("mtte.exporting")))
    progressbar.render(true)

    // 1 scene only
    if(this.scene) {
      if(!inputs.sceneName || inputs.sceneName.length == 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorMandatorySceneName"));
      }
      await MoulinetteLocalExport.exportScene(this.scene, inputs.sceneName, type, exportAll)
    }
    // All scenes from folder
    else {
      let scenes = MoulinetteLocalExport.getScenesFromFolder(this.folder)
      let idx = 0
      for(const sc of scenes) {
        progressbar.setProgress(Math.round((idx / scenes.length)*100), sc.name);
        await MoulinetteLocalExport.exportScene(sc, sc.name, type, exportAll)
        idx++
      }
    }
    progressbar.setProgress(100);
  }
}
