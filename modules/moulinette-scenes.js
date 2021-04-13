import { MoulinettePreview } from "./moulinette-preview.js"

/**
 * Forge Module for scenes
 */
export class MoulinetteScenes extends game.moulinette.applications.MoulinetteForgeModule {

  async getAssetList() {
    // load available scenes
    let client = new game.moulinette.applications.MoulinetteClient()
    let lists = await client.get("/bundler/fvtt/packs")
    
    if( !lists || lists.status != 200) {
      return console.log(`Moulinette | Error during communication with Moulinette server`, lists);
    }
    
    let scCount = 0;
    this.lists = lists.data
    
    let assets = []
    
    this.lists.scenes.forEach( sc => { 
      assets.push(`
        <div for="${sc.name}" class="pack" title="${sc.description}">
          <span class="scene">
            <input type="checkbox" class="check" name="${sc.id}" value="${sc.url}">
            ${sc.name} <small>(${sc.scenesCount})</small>
            <i class="preview fas fa-eye" data-id="${sc.filename}" title="${game.i18n.localize("mtte.preview")}"></i>
          </span>
          <a href="${sc.source.split('|')[1]}" target="_blank">${sc.source.split('|')[0]}</a>
        </div>`)
    })
  
    return assets
  }
  
  activateListeners(html) {
    // click on preview
    html.find(".preview").click(this._onPreview.bind(this));
    
    // keep messagebox reference for _updateObject
    this.msgbox = html.find(".messagebox")
    this.html = html
    
    // enable alt _alternateColors
    this._alternateColors()
  }
  
  _alternateColors() {
    $('.forge .pack').removeClass("alt");
    $('.forge .pack:even').addClass("alt");
  }
  
  async onAction(event) {
    const source = event.currentTarget;
    const window = this

    if(source.classList.contains("clear")) {
      this.html.find(".list .check:checkbox").prop('checked', false);
    }
    else if (source.classList.contains("install")) {
      const names = []
      this.html.find(".list .check:checkbox:checked").each(function () {
        names.push($(this).attr("name"))
      });
      
      const selected = this.lists.scenes.filter( ts => names.includes(ts.id) )
      if(selected.length == 0) {
        return ui.notifications.error(game.i18n.localize("ERROR.mtteSelectAtLeastOne"));
      }
      this._installScenes(selected)
    }
  }
  
  _onPreview(event) {
    event.preventDefault();
    const source = event.currentTarget;
    const sceneId = source.dataset.id;
    const thumbURL = `${game.moulinette.applications.MoulinetteClient.SERVER_URL}/static/thumbs/${sceneId}.webp`
    new MoulinettePreview({ thumb: thumbURL}).render(true)
  }
  
  /*************************************
   * Main action
   ************************************/
  async _installScenes(selected) {
    event.preventDefault();
    if(!this.lists || !this.lists.scenes) {
      return;
    }
    
    ui.scenes.activate() // give focus to scenes
    
    if(selected.length == 0) {
      ui.notifications.error(game.i18n.localize("ERROR.mtteSelectAtLeastOne"))
    } else if (selected.length > 3) {
      ui.notifications.error(game.i18n.localize("ERROR.mtteTooMany"))
    } else if (this.inProgress) {
      ui.notifications.info(game.i18n.localize("ERROR.mtteInProgress"));
    } else {
      this.inProgress = true
      let client = new game.moulinette.applications.MoulinetteClient()
      
      try {
        // iterate on each desired request
        for( const r of selected ) {
          const response = await fetch(`${game.moulinette.applications.MoulinetteClient.GITHUB_SRC}/main/${r.url}`).catch(function(e) {
            console.log(`Moulinette | Not able to fetch JSON for pack ${r.name}`, e)
          });
          if(!response) continue;
          const pack = await response.json()
          
          // retrieve all scenes from pack
          for( const sc of pack.list ) {
            
            // retrieve scene JSON
            const response = await fetch(`${game.moulinette.applications.MoulinetteClient.GITHUB_SRC}/${sc.data}`).catch(function(e) {
              console.log(`Moulinette | Not able to fetch scene of pack ${pack.name}`, e)
            });
            if(!response) continue;
            const scene = await response.json()
            
            // retrieve and upload scene image
            let proxyImg = null
            let res = null
            
            // change message to show progress (specially for image download/upload)
            if(pack.list.length == 1) {
              ui.notifications.info(game.i18n.format("mtte.forgingItem", { pack: pack.name}), 'success')
            } else {
              ui.notifications.info(game.i18n.format("mtte.forgingItemMultiple", { pack: pack.name, scene: scene.name}), 'success')
            }
              
            if(!sc.convert) { // no conversion required => try direct download
              try {
                res = await fetch(sc.url, {})
              } catch(e) {}
            }
            
            if(!res) {
              console.log("Moulinette | Direct download not working. Using proxy...")
              const proxy = await client.get(`/bundler/fvtt/image/${pack.id}/${sc.name}`)
              if(!proxy || proxy.status != 200) {
                console.log("Moulinette | Proxy download not working. Skip.")
                continue;
              }
              res = await fetch(proxy.data.url, {})
              proxyImg = proxy.data.guid
              
              // replace filename using new extension
              const oldExt = sc.name.split('.').pop(); 
              const newExt = proxy.data.url.split('.').pop(); 
              sc.name = sc.name.substring(0, sc.name.length - oldExt.length) + newExt
            }
            
            const blob = await res.blob()
            await game.moulinette.applications.Moulinette.upload(new File([blob], sc.name, { type: blob.type, lastModified: new Date() }), sc.name, "moulinette/scenes", `moulinette/scenes/${pack.id}`, false)
            if(proxyImg) {
              client.delete(`/bundler/fvtt/image/${proxyImg}`)
            }
            
            // adapt scene and create
            if(pack.list.length == 1) scene.name = pack.name
            scene.img = `moulinette/scenes/${pack.id}/${sc.name}`
            scene.tiles = []
            scene.sounds = []
            let newScene = await Scene.create(scene);
            let tData = await newScene.createThumbnail()
            await newScene.update({thumb: tData.thumb});
            client.put(`/bundler/fvtt/pack/${pack.id}`)
          }
        }
        
        ui.notifications.info(game.i18n.localize("mtte.forgingSuccess"), 'success')
      } catch(e) {
        console.log(`Moulinette | Unhandled exception`, e)
        ui.notifications.error(game.i18n.localize("mtte.forgingFailure"), 'error')
      }
      this.inProgress = false
      //this.render();
    }
  }
  
}
