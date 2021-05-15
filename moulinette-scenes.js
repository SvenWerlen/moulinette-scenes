
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
    await game.moulinette.applications.MoulinetteFileUtil.createFolderIfMissing("moulinette", "moulinette/scenes");
    
    const moduleClass = (await import("./modules/moulinette-scenes.js")).MoulinetteScenes
    game.moulinette.forge.push({
      id: "scenes",
      icon: "fas fa-map",
      name: game.i18n.localize("mtte.scenes"),
      description: game.i18n.localize("mtte.scenesDescription"),
      instance: new moduleClass(),
      actions: []
    })
    
    console.log("Moulinette Scenes | Module loaded")
  }
});


/**
 * Hook for submitting a scene
 */
Hooks.on("getSceneDirectoryEntryContext", (html, options) => {
  options.push({
    name: game.i18n.localize("mtte.share"),
    icon: '<i class="fas fa-cloud-upload-alt"></i>',
    callback: async function(li) {
      const scene = game.scenes.get(li.data("entityId"))
      new MoulinetteShare(scene).render(true)
    },
    condition: li => {
      return true;
    },
  });
});
