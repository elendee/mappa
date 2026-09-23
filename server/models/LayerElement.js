// LayerElement.js — pseudocode (bare minimal, plan §4)
// TABLE layer_elements (joined via layer_key->layers.id): id, uuid, layer_key, kind, name, lat/lng, icon, data(MEDIUMTEXT JSON), geojson(MEDIUMTEXT), created, edited
// class LayerElement extends Model { static table='layer_elements'; to_client() -> Feature{geometry:[lng,lat], properties:{kind,name,icon,...data}}; list_for_layer(id) }
import Model from './Model.js'
export default class LayerElement extends Model { static table='layer_elements' }
