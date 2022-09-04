import { MoulinettePreview } from "./moulinette-preview.js"
import { MoulinetteAvailableSceneAssets } from "./moulinette-available.js"

/**
 * Forge Module for scenes
 */
export class MoulinetteScenes extends game.moulinette.applications.MoulinetteForgeModule {
  static FOLDER_MODULES  = "modules";
  static FOLDER_CUSTOM_SCENES = "moulinette/scenes/custom";

  constructor() {
    super()
    this.scenes = []
  }
  
  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
    this.matchesCloud = null
    this.pack = null
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }
    
    const user = await game.moulinette.applications.Moulinette.getUser()
    const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      baseURL + "moulinette/images/custom/index.json",
      baseURL + "moulinette/scenes/custom/index.json"])

    // remove non-scene
    this.assets = index.assets.filter(a => {
      if(a.type == "scene" && a.filename.endsWith(".webp")) {
        // convert to scene type
        a.data = { deps: [], eDeps: [], img: a.filename, name: a.filename }
        return true;
      }
      else if(!a.data || a.data["type"] !== "scene") {
        index.packs[a.pack].count-- // decrease count in pack
        return false;
      }
      return true;
    })
    this.assetsPacks = index.packs
    
    // sort assets
    this.assets.sort((a, b) => (a.data.name > b.data.name) ? 1 : -1)

    return duplicate(this.assetsPacks)
  }
  
  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  async generateAsset(r, idx, folderIdx = null) {
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isLocal || pack.isRemote ? "" : await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = pack.sas ? "?" + pack.sas : ""
    
    // two use-cases
    // - ScenePacker : basePath based on IMG location
    // - Other cases : basePath based on JSON location
    const basePath = "tokens" in r.data ? r.data.img.substring(0, r.data.img.lastIndexOf('.')) : r.filename.substring(0, r.filename.lastIndexOf('.'))
    r.baseURL = `${URL}${pack.path}/${basePath}`
    
    const filename = r.filename.split('/').pop().replace(/_/g, " ").replace(/-/g, " ").replace(".json", "")
    const displayName = r.data.name;
    // ensure compendium is loaded before accessing it
    if(pack.isLocal && game.packs.get(r.filename)?.size === 0) {
       await game.packs.get(r.filename)?.getDocuments();
    }

    // add folder index if browsing by folder
    const folderHTML = folderIdx ? `data-folder="${folderIdx}"` : ""

    // thumb is always same as image path but with _thumb appended, except for local scenes which have thumb stored in compendium .db
    let thumbSrc = pack.isLocal ? game.packs.get(r.filename)?.get(r.data.journalId).data.thumb : `${r.baseURL}_thumb.webp${r.sas}`;
    let html = `<div class="scene" title="${r.data.name}\n(${filename})" data-idx="${idx}" data-path="${r.filename}" ${folderHTML}><img class="sc" width="200" height="200" src="${thumbSrc}"/>`
    html += `<div class="text">${displayName}</div><div class="includes">`
    if(r.data.walls) html += `<div class="info"><i class="fas fa-university"></i></div>`
    if(r.data.lights) html += `<div class="info"><i class="far fa-lightbulb"></i></div>`
    if(r.data.sounds) html += `<div class="info"><i class="fas fa-music"></i></div>`
    if(r.data.drawings) html += `<div class="info"><i class="fas fa-pencil-alt"></i></div>`
    if(r.data.notes) html += `<div class="info"><i class="fas fa-book-open"></i></div>`
    if(r.data.tokens) html += `<div class="info"><i class="fas fa-users"></i></div>`
    html += `</div><div class="resolutions">`
    // Scene Packer
    if("tokens" in r.data) html += `<div class="info" title="${game.i18n.localize("mtte.scenepackerpack")}"><img class="packer" src="modules/moulinette-scenes/img/scenepacker.svg"/></div>`
    // HD/4K
    if(basePath.indexOf("4K_") > 0) html += `<div class="info">4K</i></div>`
    else if(basePath.indexOf("HD_") > 0) html += `<div class="info">HD</i></div>`
    
    return html + "</div></div>"
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack, publisher) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    const searchTermsList = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( pack >= 0 && t.pack != pack ) return false
      // publisher doesn't match selection
      if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
      // check if text match
      for( const f of searchTermsList ) {
        if( t.data.name.toLowerCase().indexOf(f) < 0 && t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    const viewMode = game.settings.get("moulinette", "displayMode")
    
    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      for(const r of this.searchResults) {
        idx++
        assets.push(await this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndexImproved(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      let folderIdx = 0
      for(const k of keys) {
        folderIdx++;
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2 class="expand">${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2>${k} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          assets.push(await this.generateAsset(a, a.idx, folderIdx))
        }
      }
    }

    // retrieve available assets that the user doesn't have access to
    this.matchesCloud = await game.moulinette.applications.MoulinetteFileUtil.getAvailableMatches(searchTerms, "scenes", this.assetsPacks)
  
    return assets
  }

  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // keep html for later usage
    this.html = html

    // click on preview
    this.html.find(".scene").click(this._onPreview.bind(this));
    this.html.find(".scene").mouseover(function(el) {
      $(el.currentTarget).find("img.sc").css("opacity", "20%")
      $(el.currentTarget).find(".text").show()
    });
    this.html.find(".scene").mouseout(function(el) {
      $(el.currentTarget).find("img.sc").css("opacity", "100%")
      $(el.currentTarget).find(".text").hide()
    });

    // display/hide showCase
    const showCase = this.html.find(".showcase")
    if(this.matchesCloud && this.matchesCloud.length > 0) {
      // display/hide additional content
      let count = 0
      this.matchesCloud.forEach( m => count += m.matches.length )
      showCase.html('<i class="fas fa-exclamation-circle"></i> ' + game.i18n.format("mtte.showCaseAssets", {count: count}))
      showCase.addClass("clickable")
      const matches = this.matchesCloud
      showCase.click(ev => new MoulinetteAvailableSceneAssets(duplicate(matches)).render(true))
      showCase.show()
    }
    else {
      showCase.html("")
      showCase.removeClass("clickable")
      showCase.hide()
    }
  }
  

  /**
   * Footer: Dropmode
   */
  async getFooter() {
    return `<div class="showcase"></div>`
  }
  
  /**
   * Previews selected scene
   */
  _onPreview(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const idx = source.dataset.idx;
    
    if(this.searchResults && idx > 0 && idx <= this.searchResults.length) {
      const result = this.searchResults[idx-1]
      this.previewScene(result, this.assetsPacks[result.pack])
    }
  }

  /**
   * Opens scene preview UI
   */
  previewScene(tile, pack) {
    new MoulinettePreview(duplicate(tile), duplicate(pack)).render(true)
  }

  static async scanScenes(source, sourcePath) {
    const MoulinetteFileUtil = game.moulinette.applications.MoulinetteFileUtil;

    const debug = game.settings.get("moulinette-core", "debugScanAssets");

    // read publisher info from module.json
    let publishers = []
    if(debug) console.log(`Moulinette FileUtil | Root: scanning ${sourcePath} ...`)
    let dir1 = await FilePicker.browse(source, sourcePath, MoulinetteFileUtil.getOptions());
    if(debug) console.log(`Moulinette FileUtil | Root: ${dir1.dirs.length} subfolders found.`)

    // stop scanning if ignore.info file found
    if(dir1.files.find(f => f.endsWith("/ignore.info"))) {
      if(debug) console.log(`Moulinette FileUtil | File ignore.info found. Stop scanning.`)
      return publishers;
    }

    let idx = 0;
    for(const publisher of dir1.dirs) {
      SceneNavigation._onLoadProgress(game.i18n.localize("mtte.indexingMoulinette"), Math.round((idx / dir1.dirs.length)*100));
      
      if(debug) console.log(`Moulinette FileUtil | Root: processing publisher ${publisher}...`)

      // resiliency against unexpected error
      try {
        let dirPub = await FilePicker.browse(source, publisher, MoulinetteFileUtil.getOptions());
        let moduleJson = dirPub.files.find(f => f.endsWith('module.json'));
        if(!moduleJson) {
          continue;
        }
        const response = await fetch(moduleJson).catch(function(e) {
          if(debug) console.log(`Moulinette | Not able to fetch module JSON`, e)
        });
        const moduleJsonContent = await response.json();
        const scenePacks = moduleJsonContent?.packs?.filter(p => p.entity === 'Scene');
        if(scenePacks?.length > 0) {
          let packs = [];

          for(let scenePack of scenePacks) {
            const packname= `${moduleJsonContent.name}.${scenePack.name}`;
            // get matching compendium and add it's scenes
            const scenes = await game.packs.get(packname)?.getDocuments();
            if(!scenes) {
              continue;
            }

            const pack = {
              "isLocal": true,
              "assets":[],
              "deps":[],
              "license":"\u00a9 " + moduleJsonContent.author,
              "licenseUrl": moduleJsonContent.url,
              "name": scenePack.label,
              "path": publisher,
              "sas": null,
              "url":moduleJsonContent.url
            }

            for(let scene of scenes) {
              if(scene.data.img) {
                pack.assets.push(
                    {
                      "deps":[
                        scene.data.img
                      ],
                      "drawings":scene.data.drawings.size > 0,
                      "eDeps":{},
                      "img":scene.data.img,
                      "lights":scene.data.lights.size > 0,
                      "name":scene.data.name,
                      "journalId":scene.id,
                      "path":packname,
                      "sounds":scene.data.sounds.size > 0,
                      "type":"scene",
                      "walls":scene.data.walls.size > 0
                      // don't save thumb - too large size
                    }
                );
              }
            }
            packs.push(pack);
          }

          publishers.push({
            publisher: moduleJsonContent.author ? moduleJsonContent.author : game.i18n.localize("mtte.unknown"),
            website: moduleJsonContent.url ? moduleJsonContent.url : null,
            packs
          })
        }
      }
      catch (e) {
        console.warn(`Moulinette Scenes | Unexpected error from module ${publisher}.`, e)
      }
      idx++;
    }
    SceneNavigation._onLoadProgress(game.i18n.localize("mtte.indexingMoulinette"),100);  
    
    return publishers
  }

  async onAction(classList) {
    const FileUtil = game.moulinette.applications.MoulinetteFileUtil;
    if(classList.contains("indexScenes")) {
      ui.notifications.info(game.i18n.localize("mtte.indexingInProgress"));
      this.html.find(".indexScenes").prop("disabled", true);
      // index from Data / My Asset Library (The Forge)
      let publishers = await MoulinetteScenes.scanScenes(FileUtil.getSource(), MoulinetteScenes.FOLDER_MODULES);
      if(typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
        // index from Forge Bazaar
        publishers = [].concat(publishers, await MoulinetteScenes.scanScenes("forge-bazaar", MoulinetteScenes.FOLDER_MODULES))
        // index for Forge UserData
        publishers = [].concat(publishers, await MoulinetteScenes.scanScenes("data", MoulinetteScenes.FOLDER_MODULES))
      }

      await FileUtil.uploadFile(new File([JSON.stringify(publishers)], "index.json", { type: "application/json", lastModified: new Date() }), "index.json", MoulinetteScenes.FOLDER_CUSTOM_SCENES, true)
      ui.notifications.info(game.i18n.localize("mtte.indexingDone"));
      game.moulinette.cache.clear()
      this.clearCache()
      return true
    }
    // ACTION - HELP / HOWTO
    else if(classList.contains("howto")) {
      new game.moulinette.applications.MoulinetteHelp("scenes").render(true)
    }
  }
}
