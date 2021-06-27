import { MoulinettePreview } from "./moulinette-preview.js"

/**
 * Forge Module for scenes
 */
export class MoulinetteScenes extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
    this.scenes = []
  }
  
  clearCache() {
    this.assets = null
    this.assetsPacks = null
    this.searchResults = null
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
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id,
      game.moulinette.applications.MoulinetteFileUtil.getBaseURL() + "moulinette/images/custom/index.json"])
    
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
  generateAsset(r, idx) {
    const pack = this.assetsPacks[r.pack]
    const URL = pack.isLocal || pack.isRemote ? "" : game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = pack.sas ? "?" + pack.sas : ""
    
    // two types of maps. JSON files or image only
    const basePath = r.data.img.substring(0, r.data.img.lastIndexOf('.'))
    r.baseURL = `${URL}${pack.path}/${basePath}`
    
    // thumb is always same as image path but with _thumb appended
    let html = `<div class="scene" title="${r.data.name}" data-idx="${idx}" data-path="${r.filename}"><img width="200" height="200" src="${r.baseURL}_thumb.webp${r.sas}"/><div class="includes">`
    if(r.data.walls) html += `<div class="info"><i class="fas fa-university"></i></div>`
    if(r.data.lights) html += `<div class="info"><i class="far fa-lightbulb"></i></div>`
    if(r.data.sounds) html += `<div class="info"><i class="fas fa-music"></i></div>`
    if(r.data.drawings) html += `<div class="info"><i class="fas fa-pencil-alt"></i></div>`
    html += `</div><div class="resolutions">`
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
    
    searchTerms = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( pack >= 0 && t.pack != pack ) return false
      // publisher doesn't match selection
      if( publisher && publisher != this.assetsPacks[t.pack].publisher ) return false
      // check if text match
      for( const f of searchTerms ) {
        if( t.filename.toLowerCase().indexOf(f) < 0 ) return false
      }
      return true;
    })
    
    const viewMode = game.settings.get("moulinette", "displayMode")
    
    // view #1 (all mixed)
    if(viewMode == "tiles") {
      let idx = 0
      for(const r of this.searchResults) {
        idx++
        assets.push(this.generateAsset(r, idx))
      }
    }
    // view #2 (by folder)
    else if(viewMode == "list" || viewMode == "browse") {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        if(viewMode == "browse") {
          assets.push(`<div class="folder" data-path="${k}"><h2 class="expand">${k} (${folders[k].length}) <i class="fas fa-angle-double-down"></i></h2></div>`)
        } else {
          assets.push(`<div class="folder" data-path="${k}"><h2>${k} (${folders[k].length})</div>`)
        }
        for(const a of folders[k]) {
          assets.push(this.generateAsset(a, a.idx))
        }
      }
    }
  
    return assets
  }

  
  /**
   * Implements listeners
   */
  activateListeners(html) {
    // click on preview
    html.find(".scene").click(this._onPreview.bind(this));
    
    this.html = html
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
      new MoulinettePreview(duplicate(result), duplicate(this.assetsPacks[result.pack])).render(true)
    }
  }
  
}
