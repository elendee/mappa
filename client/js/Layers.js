// Layers.js — pseudocode (bare minimal, plan §4)
// store: Layer { id, name, visible, items[] } // fetch only if loggedIn; non-logged -> base map only, no fetch
// toggle = map.setLayoutProperty(visibility); panel shows checkbox/slider per layer
// pseudocode: if(loggedIn) layers=await fetch('/action_main',{action:'list_layers'}); showPanel(layers) else hidePanel()

export const Layers = { list:[], visible:true }
export default Layers
