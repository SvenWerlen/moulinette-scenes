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
      id: "moulinette-scenepreview",
      classes: ["mtte", "forge", "preview"],
      title: game.i18n.localize("mtte.preview"),
      template: "modules/moulinette-scenes/templates/preview.hbs",
      width: 420,
      height: 620,
      dragDrop: [{dragSelector: "#previewImage"}],
      closeOnSubmit: false,
      submitOnClose: false,
      resizable: true
    });
  }

  async getData() {
    const filename = this.asset.filename.split('/').pop().replace(/_/g, " ").replace(/-/g, " ").replace(".json", "")

    let scenePacker = false

    // detect if scene packer
    if("tokens" in this.asset.data) {
      this.asset.baseURL += "_thumb"
      scenePacker = true
    }

    // detect if video
    if(this.asset.data.img.endsWith(".webm")) {
      this.asset.isVideo = true
    }

    return { asset: this.asset, pack: this.pack, filename: filename, isScenePacker: scenePacker }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find("button").click(this._onClick.bind(this))
  }

  _onDragStart(event) {
    const mode = game.settings.get("moulinette", "tileMode")
    const size = game.settings.get("moulinette", "tileSize")

    const tile = duplicate(this.asset)
    tile.filename = tile.data.img
    delete tile.data

    let dragData = {}
    if(mode == "tile") {
      dragData = {
        type: "Tile",
        tile: tile,
        pack: this.pack,
        tileSize: size
      };
    } else if(mode == "article") {
      dragData = {
        type: "JournalEntry",
        tile: tile,
        pack: this.pack
      };
    } else if(mode == "actor") {
      dragData = {
        type: "Actor",
        tile: tile,
        pack: this.pack
      };
    }
    dragData.source = "mtte"
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
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
      publisherFolder = await Folder.create({name: publisher, type: "Scene", parent: moulinetteFolder.id })
    } else {
      publisherFolder = publisherFolder[0]
    }
    // pack level
    let packFolder = publisherFolder.children.filter( c => c.name == pack )
    if( packFolder.length == 0 ) {
      packFolder = await Folder.create({name: pack, type: "Scene", parent: publisherFolder.id })
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

    // special case to delegate to Scene Packer
    if("tokens" in this.asset.data) {
      if(typeof ScenePacker === 'object' && typeof ScenePacker.MoulinetteImporter === 'function') {
        const baseURL = `/assets/${game.moulinette.user.id}/${this.pack.packId}`
        const client = new game.moulinette.applications.MoulinetteClient()
        const packInfo = await client.get(baseURL)
        console.log(`Moulinette Preview | API for ScenePacker : ${baseURL}`)
        console.log(`Moulinette Preview | Asset for ScenePacker`, this.asset)
        console.log("Moulinette Preview | Result", packInfo)
        if (packInfo.status === 200) {
          try {
            let sceneID = this.asset.data.type === 'scene' ? this.asset.filename : ''
            let actorID = this.asset.data.type === 'actor' ? this.asset.filename : ''
            const moulinetteImporter = new ScenePacker.MoulinetteImporter({packInfo: packInfo.data, sceneID: sceneID, actorID: actorID})
            if (moulinetteImporter) {
              this.close()
              return moulinetteImporter.render(true)
            }
          } catch(e) {
            console.log(`Moulinette | Unhandled exception`, e)
            ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
          }
        }
      } else {
        console.error(`Moulinette | ${game.i18n.localize("mtte.errorScenepackerRequired")}. See: https://foundryvtt.com/packages/scene-packer`)
        return ui.notifications.error(game.i18n.localize("mtte.errorScenepackerRequired"))
      }
    }

    try {
      let jsonAsText;

      const img = document.getElementById("previewImage")
      this.close()
      ui.notifications.info(game.i18n.localize("mtte.downloadInProgress"));
      const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()

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
            "img": `${baseURL}${this.pack.path}/${this.asset.filename}`
          })
        } else {
          console.error("Moulinette Preview | HTML Image not found")
          return;
        }
      }

      // adapt scene and create

      // ensure compendium is loaded before accessing it
      if(this.asset.data.journalId && game.packs.get(this.asset.filename).size === 0) {
        await game.packs.get(this.asset.filename)?.getDocuments();
      }

      const sceneData = this.asset.data.journalId ?
          JSON.parse(JSON.stringify(game.packs.get(this.asset.filename).get(this.asset.data.journalId).data)) :
          JSON.parse(jsonAsText);

      // configure dimensions if no width/height set
      if( !("width" in sceneData)) {
        sceneData.width = img.naturalWidth
        sceneData.height = img.naturalHeight
      }

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
