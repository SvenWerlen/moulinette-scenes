
import { MoulinetteExport } from "./modules/moulinette-export.js"


Hooks.once("init", async function () {
  console.log("Moulinette Scenes | Init")
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


/**
 * Hook for submitting a scene
 */
Hooks.on("getSceneDirectoryEntryContext", (html, options) => {
  options.push({
    name: game.i18n.localize("mtte.export"),
    icon: '<i class="fas fa-cloud-upload-alt"></i>',
    callback: async function(li) {
      const scene = game.scenes.get(li.data("entityId"))
      new MoulinetteExport(scene, null).render(true)
    },
    condition: li => {
      return true;
    },
  });
});

Hooks.on("getSceneDirectoryFolderContext", (html, options) => {
  options.push({
    name: game.i18n.localize("mtte.export"),
    icon: '<i class="fas fa-cloud-upload-alt"></i>',
    callback: async function(li) {
      const folder = game.folders.get($(li).closest("li").data("folderId"))
      new MoulinetteExport(null, folder).render(true)
    },
    condition: li => {
      return true;
    },
  });
});
