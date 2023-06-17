/*************************
 * Preview
 *************************/
export class MoulinettePreview extends FormApplication {

  constructor(asset, pack) {
    super()
    this.asset = duplicate(asset);
    this.pack = pack;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "moulinette-scenepreview",
      classes: ["mtte", "forge", "preview"],
      title: game.i18n.localize("mtte.preview"),
      template: "modules/moulinette-scenes/templates/preview.hbs",
      width: 640,
      height: 800,
      dragDrop: [{dragSelector: "#previewImage"}],
      closeOnSubmit: false,
      submitOnClose: false,
      resizable: true
    });
  }

  /**
   * This method tries to retrieve the background image of a scene packaged with ScenePacker
   * 1) Retrieves pack Info
   * 2) Retrieves list of scenes
   * 3) Match scene with thumbnail
   * 4) Retrieve background img path
   * 5) Match path in pack Info
   */
  async getScenePackerBackgroundImage() {
    if("tokens" in this.asset.data) {
      const baseURL = `/assets/${game.moulinette.user.id}/${this.pack.packId}`
      const client = new game.moulinette.applications.MoulinetteClient()
      const packInfo = await client.get(baseURL)
      if (packInfo.status === 200) {
        if("data/Scene.json" in packInfo.data) {
          const response = await fetch(packInfo.data["data/Scene.json"]);
          if(response.status === 200) {
            const scenes = await response.json()
            for(const sc of scenes) {
              if(sc._id == this.asset.filename) {
                let backgroundURL = null
                if("background" in sc && "src" in sc["background"]) {
                  backgroundURL = sc["background"]["src"]
                } else if("img" in sc) {
                  backgroundURL = sc["img"]
                }
                if(backgroundURL && backgroundURL.length > 0) {
                  const key = `data/assets/${backgroundURL}`
                  if(key in packInfo.data) {
                    return packInfo.data[key]
                  }
                }
              }
            }
          }
        }
      }
    }
    return null
  };

  async hasOriginalThumb() {
    // videos and local images won't have original thumbs on Moulinette Cloud
    if(this.asset.isVideo || this.pack.isLocal) return false
    try {
      await jQuery.ajax({
        url: this.asset.baseURL + "_thumb_orig.webp" + this.asset.sas,
        type: 'HEAD',
        cache: false
      });
      return true
    } catch (error) {
      // error means that no original thumb exists
      console.log("MoulinettePreview | ↥↥↥ Just ignore this error. Moulinette is only checking if a thumb was provided by the creator ↥↥↥")
      return false
    }
  };

  async getData() {
    const filename = this.asset.filename.split('/').pop().replace(/_/g, " ").replace(/-/g, " ").replace(".json", "")
    
    let scenePacker = false

    // detect if scene packer
    if("tokens" in this.asset.data) {
      const scenePackerBackground = await this.getScenePackerBackgroundImage()
      if(scenePackerBackground) {
        this.asset.data.img = scenePackerBackground
        this.asset.sas = null
      } else {
        this.asset.baseURL += "_thumb"
        scenePacker = true
      }
    }

    // detect if video
    const imgPath = this.asset.data.img.split("?")[0]
    if(imgPath.endsWith(".webm") || imgPath.endsWith(".mp4")) {
      this.asset.isVideo = true
    }

    // detect if Baileywiki
    if(this.pack.publisher == "Baileywiki") {
      this.asset.baseURL += "_thumb"
    }

    // const assetURL
    const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL(this.pack.source)
    if(this.asset.data.img.startsWith("http")) {
      this.assetURL = this.asset.data.img
    } else {
      const assetURL = this.pack.path ? `${this.pack.path}/${this.asset.data.img}` : this.asset.data.img
      this.assetURL = assetURL.startsWith("http") ? assetURL : baseURL + assetURL

    }

    const previewImage = await this.hasOriginalThumb() ? `${this.asset.baseURL}_thumb_orig.webp${this.asset.sas}` : `${this.asset.baseURL}.webp${this.asset.sas}`
    return { asset: this.asset, previewImage: previewImage, pack: this.pack, assetURL: this.assetURL, filename: filename, isScenePacker: scenePacker }
  }

  activateListeners(html) {
    super.activateListeners(html);
    this.bringToTop()
    html.find("button").click(this._onClick.bind(this))
    this.html = html
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
   * Download the asset received from event
   */
  async downloadAsset() {
    const FILEUTIL = game.moulinette.applications.MoulinetteFileUtil
    const imageURL = this.asset.data.img

    // download image (always force because path is required)
    const destPath = FILEUTIL.getMoulinetteBasePath("scenes", this.pack.publisher, this.pack.name)
    const paths = await FILEUTIL.downloadDependencies([imageURL], this.pack.path, this.asset.sas, destPath, true)
    return paths[0].path
  }


  /*************************************
   * Main action
   ************************************/
  async _onClick(event) {
    event.preventDefault();
      const source = event.currentTarget;

    const overwrite = this.html.find("#forceOverwrite").prop('checked')

    // Clipboard => download background image and put into clipboard
    /* /!\ Development not ready
    if(event.currentTarget.classList.contains("clipboard")) {

      // not supported for Scene Packer
      if("tokens" in this.asset.data) {
        return ui.notifications.error(game.i18n.localize("mtte.errorScenepackerClipboard"))
      }
      // real scene
      else if(this.asset.filename.endsWith(".json")) {
        // retrieve scene JSON
        const response = await fetch(`${this.pack.path}/${this.asset.filename}${this.asset.sas}`).catch(function(e) {
          console.log(`Moulinette | Not able to fetch scene JSON`, e)
        });
        if(!response) return ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error');
        const json = await response.json()

        console.log(this.asset, this.pack)

        //const path = game.moulinette.applications.MoulinetteFileUtil.getMoulinetteBasePath("cloud", pack.publisher, pack.name)
        //asset = { data: { deps: [ json.img.replace("#DEP#", "") ], eDeps: {} }, sas: asset.sas }
        //await game.moulinette.applications.MoulinetteFileUtil.downloadDependencies(asset.data.deps, pack.path, asset.sas, path)

        console.log(json.img)
        return
      }
      // plan image
      else {
        return
      }
    }
    */
    if(source.classList.contains("createArticle")) {
      const img = document.getElementById("previewImage")
      // download if remote
      const data = { asset: this.asset, pack: this.pack }
      if(this.pack.isRemote) {
        data.img = await this.downloadAsset()
      } else {
        data.img = this.assetURL
      }
      // create folder (where to store the journal article)
      const folder = await game.moulinette.applications.Moulinette.getOrCreateFolder(this.pack.publisher, this.pack.name, "JournalEntry")
      // generate journal
      const name = data.img.split('/').pop()
      const entry = await game.moulinette.applications.Moulinette.generateArticle(name, data.img, folder.id)
      return entry.sheet.render(true)
    }
    else if(source.classList.contains("importScene")) {
      ui.scenes.activate() // give focus to scenes

      const useFolders = game.settings.get("moulinette-scenes", "createFolders")

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
              const moulinetteImporter = new ScenePacker.MoulinetteImporter({packInfo: packInfo.data, sceneID: sceneID, actorID: actorID, overwrite: overwrite})
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

      /**
       * Default case : import scene
       */
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
          const paths = await game.moulinette.applications.MoulinetteFileUtil.downloadAssetDependencies(this.asset, this.pack, "cloud", overwrite)

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
              "img": this.assetURL
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

        // generate folder structure
        if(useFolders) {
          sceneData.folder = await game.moulinette.applications.Moulinette.getOrCreateFolder(this.pack.publisher, this.pack.name, "Scene")
        }

        let newScene = await Scene.create(sceneData);
        let tData = await newScene.createThumbnail()
        await newScene.update({thumb: tData.thumb}); // force generating the thumbnail

        ui.notifications.info(game.i18n.localize("mtte.forgingSuccess"), 'success')
        if(overwrite) {
          ui.notifications.warn(game.i18n.localize("mtte.forceOverwriteNotification"), {permanent: true})
        }
      } catch(e) {
        console.log(`Moulinette | Unhandled exception`, e)
        ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
      }
    }
  }
}
