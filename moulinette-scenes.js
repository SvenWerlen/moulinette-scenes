
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
      actions: [
        {id: "clear", icon: "far fa-square" ,name: game.i18n.localize("mtte.clearAction"), help: game.i18n.localize("mtte.clearActionToolTip") },
        {id: "install", icon: "fas fa-hammer" ,name: game.i18n.localize("mtte.forge"), help: game.i18n.localize("mtte.forgeToolTip") }
      ]
    })
    
    console.log("Moulinette Scenes | Module loaded")
  }
});
