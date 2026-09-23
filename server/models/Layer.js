// Layer.js — pseudocode (bare minimal, plan §4 + DB note)
// TABLE layers (TEXT/MEDIUMTEXT for geo, no GEOMETRY): id, uuid, user_key, name, visible, border_image, primary/secondary/tertiary_color, created, edited
// class Layer extends Model { static table='layers', owner='user_key'; get_by_uuid(uuid); list_for_user(id); publish_with_items() -> {id,name,visible,items[]} }
import Model from './Model.js'
export default class Layer extends Model { static table='layers'; static owner_test='user_key' }
