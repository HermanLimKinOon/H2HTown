# Kuala Lumpur city-centre map data

© OpenStreetMap contributors.

This folder contains an OSM-derived database distributed under the Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/

Attribution and copyright information: https://www.openstreetmap.org/copyright

Source: https://api.openstreetmap.org/api/0.6/map?bbox=101.690,3.148,101.704,3.160

Bounding box: west 101.690, south 3.148, east 101.704, north 3.160.
Projection origin: latitude 3.15359, longitude 101.69641 (the centre in the user's OSM link).

`kuala-lumpur-source.json` contains the selected OSM ways and assembled multipolygon outer rings plus selected named places. Contributor/account metadata is omitted. `kuala-lumpur-city.json` is the projected, bounded game dataset. Coordinates are in metres, rounded to 0.1 m. North is negative Z. Building outlines crossing the export boundary and road segments are clipped. Not every OSM feature or multipolygon inner ring is represented.

Building heights use OSM height values when present (including feet conversion), otherwise building:levels × 3.2 m, otherwise a generic fallback. These estimates are marked in the data. Building-part height and min_height are used where available. Features are generic 3D extrusions, not photographic reconstructions. Rivers/parks are derived from available mapped ways. Some water/park areas crossing the boundary may be omitted. This city-centre district does not include the Petronas Towers.

The generated dataset is available for download through the in-game Map data link. OSM attribution and an ODbL link remain visible in the town HUD.

To rebuild after downloading the XML source above:

    python3 scripts/convert-osm-export.py /path/to/map.osm
    node --import tsx scripts/import-osm-town.mts

The timestamp records generation of this local export, not the last edit time of each source object. No live OSM or Overpass service is contacted when players load the game.
