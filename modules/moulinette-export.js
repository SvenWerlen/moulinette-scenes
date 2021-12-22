/*************************
 * Export a scene
 *************************/
export class MoulinetteExport extends FormApplication {
  
  constructor(folder) {
    super()
    this.folder = folder;
  }
  
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-export",
      classes: ["mtte", "export"],
      title: game.i18n.localize("mtte.export"),
      template: "modules/moulinette-scenes/templates/export.hbs",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  
  async getData() {
    const folders = MoulinetteExport.getFolderPath(this.folder)
    const user = await game.moulinette.applications.Moulinette.getUser()
    let error = null
    if(!user.patron) {
      error = game.i18n.localize("mtte.exportErrorLogin")
    } else if(!user.hasEarlyAccess()) {
      error = game.i18n.localize("mtte.exportErrorPatron")
    }

    return {
      sceneFolder: folders,
      creator: "Moulinette Private",
      pack: this.folder.name,
      count: MoulinetteExport.getScenesFromFolder(this.folder).length,
      error: error
    };
  }

  /**
   * Implements listeners
   */
  activateListeners(html) {
    this.html = html
  }

  /**
   * Returns the folder paths recursively
   */
  static getFolderPath(folder) {
    if(!folder) {
      return ""
    }

    if(folder.data.parent) {
      const parent = game.folders.get(folder.data.parent)
      if( parent ) {
        return MoulinetteExport.getFolderPath(parent) + "/" + folder.name
      }
    }
    return folder.data.name
  }

  /**
   * Returns all the scenes from folder
   */
  static getScenesFromFolder(folder) {
    let scenes = game.scenes.filter(sc => sc.data.folder == folder.id)
    const subFolders = game.folders.filter(f => f.data.parent == folder.id)
    for(const subFolder of subFolders) {
      scenes = scenes.concat(MoulinetteExport.getScenesFromFolder(subFolder))
    }
    return scenes;
  }

  /**
   * Exports a scene to Moulinette Cloud
   * - scene     : scene (data)
   * - folder    : root folder
   * - scIdx     : index of the current scene
   * - count     : number of scenes in the pack
   * - exportAll : true if assets from /modules and /system must be exported, too
   *
   * Developer notes regarding "state". "First" should only be used on the very first file
   * to be uploaded (triggers a cleanup/initialization on the server). "Last" should only be
   * used on the very last file (triggers the preparation of the pack)
   */
  static async exportScene(scene, folder, creatorName, packName, scIdx, count, exportAll = false) {
    const sceneNameClean = scene.name.replace(/ /g, "-").replace(/[^\w-_]+/g, '')
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    packName = `${creatorName}-${packName}`

    // get relative path
    const rootFolders = MoulinetteExport.getFolderPath(folder)
    const sceneFolders = MoulinetteExport.getFolderPath(scene.folder)
    const scenePath = sceneFolders.substring(rootFolders.length + 1)
    const sceneDepsPath = "deps"

    // regenerate thumbnail
    const thumb = await scene.createThumbnail({width:400, height:400})
    const blob = FILEUTIL.b64toBlob(thumb.thumb)
    if(! await FILEUTIL.uploadToMoulinette(
      new File([blob], sceneNameClean + "_thumb.png", { type: blob.type, lastModified: new Date() }), scenePath,
      scIdx == 0 ? "first" : "-",
      packName)) {
      console.error(`Moulinette Export | Failed to upload thumbnail for scene '${scene.name}'`)
      return false;
    }

    // remove tokens (won't work) and thumb (will be regenerated)
    scene = duplicate(scene.data)
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
          if(exportAll || (!m[1].startsWith("modules/") && !m[1].startsWith("systems/") && !m[1].startsWith("icons/"))) {
            paths.add(m[1])
          }
        }
      }
    }

    // upload all assets
    let idx = 0
    for(const path of paths) {
      idx++
      let filename = path.split("/").pop()                                  // filename only
      let basePath = path.substring(0, path.length - filename.length - 1)   // basePath (parent)
      if(basePath.startsWith("http")) {                                     // if image is stored remotely, extract the basePath from the URL
        basePath = (new URL(basePath)).pathname.substring(1)
      }
      let blob = null
      try {
        const res = await fetch(path)
        if(!res || res.status != 200) {
          console.error(`Moulinette Export | Failed to download asset '${path}' (scene '${scene.name}')`)
          return false;
        }
        blob = await res.blob()
      } catch( err ) {
        console.error(`Moulinette Export | Exception while downloading asset '${path}' (scene '${scene.name}')`)
        return false;
      }
      if(! await FILEUTIL.uploadToMoulinette(
          new File([blob], decodeURIComponent(filename), { type: blob.type, lastModified: new Date() }),
          `${sceneDepsPath}/${basePath}`,
          "-", // state
          packName)) {
        console.error(`Moulinette Export | Failed to upload asset '${path}' (scene '${scene.name}').`)
        console.error(`MoulinetteExport | 1) Check that the size of file '${path}' is not larger than 10MB!`)
        console.error(`MoulinetteExport | 2) Chrome browser sometimes blocks binary files like images. Give a try with another browser like Firefox!`)
        return false;
      }

      // images get converted to WEBP
      if(filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
        filename = filename.substring(0, filename.lastIndexOf(".")) + ".webp"
      }
      jsonData = jsonData.replaceAll(path, "#DEP#" + decodeURIComponent(`deps/${basePath}/${filename}`))
    }

    // upload JSON
    const jsonFile = sceneNameClean + ".json"
    if(! await FILEUTIL.uploadToMoulinette(
      new File([jsonData], jsonFile, { type: "application/json", lastModified: new Date() }),
      scenePath,
      scIdx == count-1 ? "last" : "-",
      packName)) {
      console.error(`Moulinette Export | Failed to upload data for scene '${scene.name}'`)
      return false;
    }

    return true
  }

  
  async _updateObject(event, inputs) {
    event.preventDefault();
    const button = event.submitter;
    if(button.classList.contains("cancel")) {
      return this.close()
    }
    else if(button.classList.contains("cloud")) {
      return window.open("https://assets.moulinette.cloud/byoa/manage-assets", '_blank');
    }

    const exportAll = inputs.exportAll
    const creatorName = inputs.creator.length > 0 ? inputs.creator : "Moulinette Private"
    const packName = inputs.pack.length > 0 ? inputs.pack : this.folder.name

    this.html.find("button").prop('disabled', true)
    this.html.find(".progressBlock").css("visibility", "visible");
    this.html.find(".progressBlock").css("color", "darkgreen");
    this.html.find(".progressBlock .progress").text("1%")
    this.html.find(".progressBar").css("background-color", "darkgreen")
    this.html.find(".progressBar").width("1%")

    let scenes = MoulinetteExport.getScenesFromFolder(this.folder)
    let idx = 0
    for(const sc of scenes) {
      const ok = await MoulinetteExport.exportScene(sc, this.folder, creatorName, packName, idx, scenes.length, exportAll)
      if(!ok) {
        this.html.find(".progressBlock").css("color", "darkred");
        this.html.find(".progressBar").css("background-color", "darkred")
        this.html.find(".progressBlock .progress").text(game.i18n.localize("mtte.exportError"))
        this.html.find("button").prop('disabled', false)
        return;
      }

      idx++
      const progress = Math.round((idx / scenes.length)*100)
      this.html.find(".progressBlock .progress").text(`${progress}%`)
      this.html.find(".progressBar").width(`${progress}%`)
    }

    this.html.find(".progressBlock .progress").text("100%")
    this.html.find(".progressBar").width("100%")
    this.html.find("button").prop('disabled', false)
  }
}
