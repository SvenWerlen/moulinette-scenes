import { MoulinettePreview } from "./moulinette-preview.js"

/**
 * Forge Module for scenes
 */
export class MoulinetteScenes extends game.moulinette.applications.MoulinetteForgeModule {
  
  static FOLDER_MODULES  = "modules";
  static FOLDER_CUSTOM_SCENES = "moulinette/scenes/custom";
  static SCENE_EXT = ["jpg","jpeg","png","webp","webm","avif"]

  constructor() {
    super()
    this.scenes = []
  }
  
  supportsWholeWordSearch() { return true }

  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
  }
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    if(this.assetsPacks) {
      return duplicate(this.assetsPacks)
    }
    
    const user = await game.moulinette.applications.Moulinette.getUser()
    const worldId = game.world.id
    const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/byoa/assets/" + game.moulinette.user.id,
      baseURL + `moulinette/scenes/custom/index-mtte.json`])

    // remove non-scene
    this.assets = index.assets.filter(a => {
      if(a.type == "scene") {
        // convert to scene type
        if(!a.data) {
          a.data = { deps: [], eDeps: [], img: a.filename, name: a.filename }
        }
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
   * Returns true if scene is gridded (based on name)
   * - Must contain "grid" in name
   * - Must not contain "ungrid" in name
   * - Must not contain "gridless" in name
   */
  static isSceneGridded(path) {
    return path.toLowerCase().indexOf("grid") > 0 && path.toLowerCase().indexOf("ungrid") < 0 && path.toLowerCase().indexOf("gridless") < 0
  }
  
  /**
   * Generate a new asset (HTML) for the given result and idx
   */
  async generateAsset(r, idx, folderIdx = null) {
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isLocal || pack.isRemote || pack.path.match(/^https?:\/\//) || r.filename.match(/^https?:\/\//) ? "" : await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = pack.sas ? "?" + pack.sas : ""
    
    // two use-cases
    // - ScenePacker : basePath based on IMG location
    // - Other cases : basePath based on JSON location
    const basePath = "tokens" in r.data ? r.data.img.substring(0, r.data.img.lastIndexOf('.')) : r.filename.substring(0, r.filename.lastIndexOf('.'))
    r.baseURL = URL.length > 0 || pack.path.length > 0 ? `${URL}${pack.path}/${basePath}` : basePath
    const fallBackURL = URL.length > 0 || pack.path.length > 0 ? `${URL}${pack.path}/${r.filename}` : r.filename
    
    const filename = r.filename.split('/').pop().replace(/_/g, " ").replace(/-/g, " ")
    const displayName = decodeURIComponent(filename.substring(0, filename.lastIndexOf(".")))
    // ensure compendium is loaded before accessing it
    if(pack.isLocal && game.packs.get(r.filename)?.size === 0) {
       await game.packs.get(r.filename)?.getDocuments();
    }

    // add folder index if browsing by folder
    const folderHTML = folderIdx ? `data-folder="${folderIdx}"` : ""

    // thumb is always same as image path but with _thumb appended, except for local scenes which have thumb stored in compendium .db
    let thumbSrc = ""
    if(pack.isLocal && r.data.journalId) {
      // in case the entry couldn't be found
      if(game.packs.get(r.filename)?.get(r.data.journalId)) {
        thumbSrc = game.packs.get(r.filename)?.get(r.data.journalId).thumb
      }
    } else if(pack.isRemote) {
      thumbSrc = `${r.baseURL}_thumb.webp${r.sas}`
    } else {
      if(game.settings.get("moulinette-scenes", "generateThumbnails")) {
        // baseURL for the current FVTT installation
        const baseURL = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
        // baseURL specific to the pack (could point to another source)
        const baseURLPack = await game.moulinette.applications.MoulinetteFileUtil.getBaseURL(pack.source)
        // asset URL (without extension)
        const assetURL = r.baseURL.startsWith(baseURLPack) ? r.baseURL.substring(baseURLPack.length) : baseURL
        thumbSrc =  `${baseURL}moulinette/thumbs/${assetURL}_thumb.webp`
      } else {
        thumbSrc = fallBackURL
      }
    }

    let html = `<div class="scene" title="${decodeURIComponent(r.data.name)}" data-idx="${idx}" data-path="${r.filename}" ${folderHTML}><img class="sc" width="200" height="200" src="${thumbSrc}" data-fallback="${fallBackURL}"/>`
    html += `<div class="text">${displayName}</div><div class="includes">`
    if(r.data.walls) html += `<div class="info"><i class="fas fa-university"></i></div>`
    if(r.data.lights) html += `<div class="info"><i class="far fa-lightbulb"></i></div>`
    if(r.data.sounds) html += `<div class="info"><i class="fas fa-music"></i></div>`
    if(r.data.drawings) html += `<div class="info"><i class="fas fa-pencil-alt"></i></div>`
    if(r.data.notes) html += `<div class="info"><i class="fas fa-book-open"></i></div>`
    if(r.data.tokens) html += `<div class="info"><i class="fas fa-users"></i></div>`
    html += `</div>`
    // Scene Packer
    if("tokens" in r.data) html += `<div class="types"><div class="info" title="${game.i18n.localize("mtte.scenepackerpack")}"><img class="packer" src="modules/moulinette-scenes/img/scenepacker.svg"/></div></div>`
    // HD/4K
    html += `<div class="resolutions">`
    if(basePath.indexOf("4K_") > 0 || pack.name.endsWith("4K")) html += `<div class="info">4K</i></div>`
    else if(basePath.indexOf("HD_") > 0 || pack.name.endsWith("HD")) html += `<div class="info">HD</i></div>`
    // Grid
    if(MoulinetteScenes.isSceneGridded(basePath)) {
      html += `<div class="info"><i class="fas fa-border-all"></i></div>`
    }
    html += "</div>"
    
    return html + "</div>"
  }
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, packs, publisher, moduleFilters) {
    let assets = []
    const packList = packs == "-1" ? null : ('' + packs).split(",").map(Number);

    // pack must be selected or terms provided
    if(!packList && (!publisher || publisher.length == 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    const wholeWord = game.settings.get("moulinette", "wholeWordSearch")
    const searchTermsList = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( packList && !packList.includes(t.pack) ) return false
      // publisher doesn't match selection
      if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
      // check module filters
      if(moduleFilters.includes("walls") && !t.data.walls) return false
      if(moduleFilters.includes("lights") && !t.data.lights) return false
      if(moduleFilters.includes("drawings") && !t.data.drawings) return false
      if(moduleFilters.includes("notes") && !t.data.notes) return false
      if(moduleFilters.includes("tokens") && !t.data.tokens) return false
      if(moduleFilters.includes("hd") && !this.assetsPacks[t.pack].name.endsWith("HD")) return false
      if(moduleFilters.includes("4K") && !this.assetsPacks[t.pack].name.endsWith("4K")) return false
      if(moduleFilters.includes("SP") && !t.data.tokens) return false
      if(moduleFilters.includes("grid") && !MoulinetteScenes.isSceneGridded(t.filename)) return false
      if(moduleFilters.includes("gridless") && MoulinetteScenes.isSceneGridded(t.filename)) return false
      // check if text match
      for( const f of searchTermsList ) {
        const textToSearch = game.moulinette.applications.Moulinette.cleanForSearch(t.data.name + " " + t.filename)
        const regex = wholeWord ? new RegExp("\\b"+ f.toLowerCase() +"\\b") : new RegExp(f.toLowerCase())
        if(!regex.test(textToSearch)) {
          return false;
        }
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
        const breadcrumb = game.moulinette.applications.Moulinette.prettyBreadcrumb(k)
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2 class="expand">${breadcrumb} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-idx="${folderIdx}"><h2>${breadcrumb} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          assets.push(await this.generateAsset(a, a.idx, folderIdx))
        }
      }
    }

    // retrieve available assets that the user doesn't have access to
    //this.matchesCloud = await game.moulinette.applications.MoulinetteFileUtil.getAvailableMatches(searchTerms, "scenes", this.assetsPacks)
    this.matchesCloudTerms = searchTerms
    const parent = this
    game.moulinette.applications.MoulinetteFileUtil.getAvailableMatchesMoulinetteCloud(searchTerms, "maps", true).then(results => {
      // not yet ready?
      if(!parent.html) return;
      // display/hide showCase
      const showCase = parent.html.find(".showcase")
      if(results && results.count > 0) {
        // display/hide additional content
        showCase.html('<i class="fas fa-exclamation-circle"></i> ' + game.i18n.format("mtte.showCaseAssets", {count: results.count}))
        showCase.addClass("clickable")
        showCase.show()
      }
      else {
        showCase.html("")
        showCase.removeClass("clickable")
        showCase.hide()
      }
    })

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

    // click on showCase
    this.html.find(".showcase").click(ev => new game.moulinette.applications.MoulinetteAvailableAssets(this.matchesCloudTerms, "maps", 200).render(true))

    // fallback image
    this.html.find(".scene img").on('error', ev => {
      ev.preventDefault();
      const imObj = $(ev.currentTarget)
      const fallbackURL = imObj.data('fallback')
      if(fallbackURL) {
        imObj.data('fallback', "") // avoid infinite fallback
        imObj.attr('src', fallbackURL)
      }
    });
  }
  

  /**
   * Footer: Dropmode
   */
  async getFooter() {
    return ""
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
      
      const publisherId = publisher.split("/").pop()
      if(debug) console.log(`Moulinette FileUtil | Root: processing publisher ${publisherId}...`)

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
        const scenePacks = moduleJsonContent?.packs?.filter(p => p.entity === 'Scene' || p.type === 'Scene');
        if(scenePacks?.length > 0) {
          let packs = [];

          for(let scenePack of scenePacks) {
            const packname = `${publisherId}.${scenePack.name}`;

            if(debug) console.log(`Moulinette | - ${packname}`)
            // get matching compendium and add it's scenes
            const scenes = await game.packs.get(packname)?.getDocuments();
            if(!scenes) {
              console.warn(`Moulinette | Couldn't load scenes from ${packname} because module is not enabled!`)
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
              "source": source,
              "sas": null,
              "url": moduleJsonContent.url,
              "optimized" : true
            }

            for(let scene of scenes) {
              if(scene.data.img) {
                pack.assets.push(
                    {
                      "deps":[
                        scene.data.img
                      ],
                      "drawings": scene.data.drawings.size > 0,
                      "eDeps":{},
                      "img": scene.data.img.startsWith("http") ? scene.data.img : scene.data.img.substring(pack.path.length),
                      "lights": scene.data.lights.size > 0,
                      "name": scene.data.name,
                      "journalId": scene.id,
                      "path": packname,
                      "sounds": scene.data.sounds.size > 0,
                      "type":"scene",
                      "walls": scene.data.walls.size > 0
                      // don't save thumb - too large size
                    }
                );
              }
            }
            if(pack.assets.length > 0) {
              packs.push(pack);
            }
          }

          if(packs.length > 0) {
            publishers.push({
              publisher: moduleJsonContent.author ? moduleJsonContent.author : game.i18n.localize("mtte.unknown"),
              website: moduleJsonContent.url ? moduleJsonContent.url : null,
              packs
            })
          }
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

  /**
   * Indexes all scenes from loaded modules
   */
  async indexAssets() {
    // index from Data / My Asset Library (The Forge)
    const publishers = await MoulinetteScenes.scanScenes("data", MoulinetteScenes.FOLDER_MODULES);
    if(typeof ForgeVTT != "undefined" && ForgeVTT.usingTheForge) {
      // index from Forge Bazaar
      publishers.push(...await MoulinetteScenes.scanScenes("forge-bazaar", MoulinetteScenes.FOLDER_MODULES))
    }
    return publishers
  }

  async onAction(classList) {
    // ACTION - HELP / HOWTO
    if(classList.contains("howto")) {
      new game.moulinette.applications.MoulinetteHelp("scenes").render(true)
    }
    // ACTION - CONFIGURE SOURCES
    else if(classList.contains("configureSources")) {
      (new game.moulinette.applications.MoulinetteSources(this, ["scenes"], MoulinetteScenes.SCENE_EXT)).render(true)
    }
  }

  /**
   * Overwrite this function to add filters
   */
  getFilters() {
    return [
      {
        id: "walls",
        name: game.i18n.localize("mtte.filterHasWalls"),
        icon: `<i class="fas fa-university"></i>`,
      }, {
        id: "lights",
        name: game.i18n.localize("mtte.filterHasLights"),
        icon: `<i class="far fa-lightbulb"></i>`,
      }, {
        id: "drawings",
        name: game.i18n.localize("mtte.filterHasDrawings"),
        icon: `<i class="fas fa-pencil-alt"></i>`,
      }, {
        id: "notes",
        name: game.i18n.localize("mtte.filterHasNotes"),
        icon: `<i class="fas fa-book-open"></i>`,
      }, {
        id: "tokens",
        name:game.i18n.localize("mtte.filterHasTokens"),
        icon: `<i class="fas fa-users"></i>`,
      }, {
        id: "hd",
        name: game.i18n.localize("mtte.filterHDOnly"),
        icon: "",
      }, {
        id: "4K",
        name: game.i18n.localize("mtte.filter4KOnly"),
        icon: "",
      }, {
        id: "SP",
        name: game.i18n.localize("mtte.isScenePacker"),
        icon: "",
      }, {
        id: "grid",
        name: game.i18n.localize("mtte.filterHasGrid"),
        icon: `<i class="fas fa-border-all"></i>`,
      }, {
        id: "gridless",
        name: game.i18n.localize("mtte.filterIsGridless"),
        icon: `<i class="fas fa-border-none"></i>`,
      }
    ]
  }


}
