
import { MoulinetteExport } from "./modules/moulinette-export.js"
import { MoulinetteLocalExport } from "./modules/moulinette-localexport.js"


Hooks.once("init", async function () {
  console.log("Moulinette Scenes | Init")

  game.settings.register("moulinette-scenes", "createFolders", {
    name: game.i18n.localize("mtte.configCreateFolders"),
    hint: game.i18n.localize("mtte.configCreateFoldersHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });


  game.settings.register("moulinette-scenes", "generateThumbnails", {
    name: game.i18n.localize("mtte.configGenerateThumbnails"),
    hint: game.i18n.localize("mtte.configGenerateThumbnailsHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

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
        {id: "configureSources", icon: "fas fa-cogs" ,name: game.i18n.localize("mtte.configureSources"), help: game.i18n.localize("mtte.configureSourcesToolTip") },
        {id: "howto", icon: "fas fa-question-circle" ,name: game.i18n.localize("mtte.howto"), help: game.i18n.localize("mtte.howtoToolTip") }
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
    name: game.i18n.localize("mtte.localexport"),
    icon: '<i class="fas fa-upload"></i>',
    callback: async function(li) {
      const scene = game.scenes.get(li.data("documentId"))
      new MoulinetteLocalExport(scene, null).render(true)
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
      new MoulinetteExport(folder).render(true)
    },
    condition: li => {
      return true;
    },
  });
  options.push({
    name: game.i18n.localize("mtte.localexport"),
    icon: '<i class="fas fa-upload"></i>',
    callback: async function(li) {
      const folder = game.folders.get($(li).closest("li").data("folderId"))
      new MoulinetteLocalExport(null, folder).render(true)
    },
    condition: li => {
      return true;
    },
  });
});
