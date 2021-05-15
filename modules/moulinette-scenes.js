import { MoulinettePreview } from "./moulinette-preview.js"

/**
 * Forge Module for scenes
 */
export class MoulinetteScenes extends game.moulinette.applications.MoulinetteForgeModule {

  constructor() {
    super()
    this.scenes = []
  }
  
  
  /**
   * Returns the list of available packs
   */
  async getPackList() {
    const user = await game.moulinette.applications.Moulinette.getUser()
    const index = await game.moulinette.applications.MoulinetteFileUtil.buildAssetIndex([
      game.moulinette.applications.MoulinetteClient.SERVER_URL + "/assets/" + game.moulinette.user.id])
    
    // remove non-scene
    this.assets = index.assets.filter(a => {
      if(!a.data || a.data["type"] !== "scene") {
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
    const URL = game.moulinette.applications.MoulinetteFileUtil.getBaseURL()
    // sas (Shared access signature) for accessing remote files (Azure)
    r.sas = this.assetsPacks[r.pack].isRemote && game.moulinette.user.sas ? "?" + game.moulinette.user.sas : ""
    // thumb is always same as image path but with _thumb appended
    const basePath = r.filename.substring(0, r.filename.lastIndexOf('.'))
    r.baseURL = `${URL}${this.assetsPacks[r.pack].path}/${basePath}`
    let html = `<div class="scene" title="${r.data.name}" data-idx="${idx}"><img width="200" height="200" src="${r.baseURL}_thumb.webp${r.sas}"/><div class="includes">`
    if(r.data.walls) html += `<div class="info"><i class="fas fa-university"></i></div>`
    if(r.data.lights) html += `<div class="info"><i class="far fa-lightbulb"></i></div>`
    return html + "</div></div>"
  }
  
  
  /**
   * Implements getAssetList
   */
  async getAssetList(searchTerms, pack) {
    let assets = []
    this.pack = pack
    
    // pack must be selected or terms provided
    if((!pack || pack < 0) && (!searchTerms || searchTerms.length == 0)) {
      return []
    }
    
    searchTerms = searchTerms.split(" ")
    // filter list according to search terms and selected pack
    this.searchResults = this.assets.filter( t => {
      // pack doesn't match selection
      if( pack >= 0 && t.pack != pack ) return false
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
    else {
      const folders = game.moulinette.applications.MoulinetteFileUtil.foldersFromIndex(this.searchResults, this.assetsPacks);
      const keys = Object.keys(folders).sort()
      for(const k of keys) {
        assets.push(`<div class="folder"><h2>${k}</h2></div>`)
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
   * Implements actions
   * - clear: unchecks all check boxes
   * - install: installs all selected scenes
   */
  async onAction(classList) {
    if(classList.contains("clear")) {
      this.html.find(".list .check:checkbox").prop('checked', false);
    }
    else if (classList.contains("install")) {
      const names = []
      this.html.find(".list .check:checkbox:checked").each(function () {
        names.push($(this).attr("name"))
      });
      
      const selected = (await this._getAvailableScenes()).filter( ts => names.includes(ts.id) )
      if(selected.length == 0) {
        return ui.notifications.error(game.i18n.localize("mtte.errorSelectAtLeastOne"));
      }
      this._installScenes(selected)
    } 
    else {
      console.warn(`MoulinetteScenes | No action implemented for action '${classList}'`)
    }
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
