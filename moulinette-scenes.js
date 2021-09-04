
import { MoulinetteShare } from "./modules/moulinette-share.js"


Hooks.once("init", async function () {
  console.log("Moulinette Scenes | Init")
  game.settings.register("moulinette", "shareImgAuthor", { scope: "world", config: false, type: String });
  game.settings.register("moulinette", "shareDiscordId", { scope: "world", config: false, type: String });
})

/**
 * Ready: defines a shortcut to open Moulinette Interface
 */
Hooks.once("ready", async function () {
  if (game.user.isGM) {
    // create default home folder for scenes
    await game.moulinette.applications.MoulinetteFileUtil.createFolderRecursive("moulinette/scenes/custom")
    
    const moduleClass = (await import("./modules/moulinette-scenes.js")).MoulinetteScenes
    game.moulinette.forge.push({
      id: "scenes",
      icon: "fas fa-map",
      name: game.i18n.localize("mtte.scenes"),
      description: game.i18n.localize("mtte.scenesDescription"),
      instance: new moduleClass(),
      actions: [
        {id: "indexScenes", icon: "fas fa-sync" ,name: game.i18n.localize("mtte.indexScenes"), help: game.i18n.localize("mtte.indexScenesToolTip") }
      ]
    })
    
    console.log("Moulinette Scenes | Module loaded")
  }
});
