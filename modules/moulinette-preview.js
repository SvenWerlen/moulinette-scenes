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
  
  /**
   * Generates moulinette folders
   */
  static async getOrCreateSceneFolder(publisher, pack) {
    let moulinetteFolder = game.folders.filter( f => f.name == "Moulinette" && f.type == "Scene" )

    // main
    if( moulinetteFolder.length == 0 ) {
      moulinetteFolder = await Folder.create({name:"Moulinette", type:"Scene", parent: null})
    } else {
      moulinetteFolder = moulinetteFolder[0]
    }
    // publisher level
    let publisherFolder = moulinetteFolder.children.filter( c => c.name == publisher )
    if( publisherFolder.length == 0 ) {
      publisherFolder = await Folder.create({name: publisher, type: "Scene", parent: moulinetteFolder._id })
    } else {
      publisherFolder = publisherFolder[0]
    }
    // pack level
    let packFolder = publisherFolder.children.filter( c => c.name == pack )
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "Scene", parent: publisherFolder._id })
    } else {
      packFolder = packFolder[0]
    }
    return packFolder
  }
  
  /*************************************
   * Main action
   ************************************/
  async _onClick(event) {
    event.preventDefault();
    
    ui.scenes.activate() // give focus to scenes
    try {
      let jsonAsText;
      
      const img = document.getElementById("previewImage")
      this.close()
      ui.notifications.info(game.i18n.localize("mtte.downloadInProgress"));
      
      // Moulinette Cloud scenes
      if(this.asset.filename.endsWith(".json")) {
        // retrieve scene JSON
        const response = await fetch(`${this.pack.path}/${this.asset.filename}${this.asset.sas}`).catch(function(e) {
          console.log(`Moulinette | Not able to fetch scene JSON`, e)
        });
        if(!response) return ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error');
        
        // download all dependencies
        const paths = await game.moulinette.applications.MoulinetteFileUtil.downloadAssetDependencies(this.asset, this.pack, "cloud")
      
        // replace all DEPS
        jsonAsText = await response.text()
        
        for(let i = 0; i<paths.length; i++) {
          jsonAsText = jsonAsText.replace(new RegExp(`#DEP${ i == 0 ? "" : i-1 }#`, "g"), paths[i])
        }
      }
      // Simple images
      else {
        if(img) {
          jsonAsText = JSON.stringify({
            "name": game.moulinette.applications.Moulinette.prettyText(this.asset.filename.split("/").pop()),
            "navigation": false,
            "width": img.naturalWidth,
            "height": img.naturalHeight,
            "img": `${this.pack.path}/${this.asset.filename}`
          })
        } else {
          console.error("Moulinette Preview | HTML Image not found")
          return;
        }
      }
      
      // adapt scene and create
      const sceneData = JSON.parse(jsonAsText)
      sceneData.folder = await MoulinettePreview.getOrCreateSceneFolder(this.pack.publisher, this.pack.name)
      let newScene = await Scene.create(sceneData);
      let tData = await newScene.createThumbnail()
      await newScene.update({thumb: tData.thumb}); // force generating the thumbnail
      
      ui.notifications.info(game.i18n.localize("mtte.forgingSuccess"), 'success')
    } catch(e) {
      console.log(`Moulinette | Unhandled exception`, e)
      ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
    }
  }
}
