/**
 * The parts of Tiled's JSON map format (.tmj) that we use.
 * https://doc.mapeditor.org/en/stable/reference/json-map-format/
 */
export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file' | 'object' | 'class';
  propertytype?: string;
  value: string | number | boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  /** The object's Class (Tiled 1.10+ writes it as "type"; 1.9 used "class"). */
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  point?: boolean;
  polyline?: { x: number; y: number }[];
  properties?: TiledProperty[];
}

export interface TiledObjectLayer {
  id: number;
  name: string;
  type: 'objectgroup';
  objects: TiledObject[];
  draworder: 'topdown' | 'index';
  opacity: number;
  visible: boolean;
  x: number;
  y: number;
  color?: string;
}

export interface TiledMap {
  type: 'map';
  version: string;
  tiledversion: string;
  orientation: 'orthogonal';
  renderorder: 'right-down';
  infinite: boolean;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  nextlayerid: number;
  nextobjectid: number;
  layers: (TiledObjectLayer | { type: string; name: string })[];
  tilesets: unknown[];
  properties?: TiledProperty[];
  backgroundcolor?: string;
}
