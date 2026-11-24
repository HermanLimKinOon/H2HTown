import xml.etree.ElementTree as ET,json,datetime
from pathlib import Path
import sys
root=ET.parse(sys.argv[1] if len(sys.argv)>1 else '/private/tmp/h2h-kl-map.osm').getroot()
nodes={e.attrib['id']:{'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon'])} for e in root.findall('node')}
ways={e.attrib['id']:e for e in root.findall('way')}
def tags(e):return {t.attrib['k']:t.attrib['v'] for t in e.findall('tag')}
def refs(e):return [n.attrib['ref'] for n in e.findall('nd')]
def geom(ids):return [nodes[n] for n in ids if n in nodes]
elements=[{'type':'way','id':int(i),'tags':tags(w),'geometry':geom(refs(w))} for i,w in ways.items() if any(k in tags(w) for k in ['building','building:part','highway','waterway','natural','leisure'])]
# Assemble multipolygon outer rings into closed ways, retaining OSM relation IDs as negative IDs.
for r in root.findall('relation'):
 t=tags(r)
 if not any(k in t for k in ['building','natural','leisure']):continue
 parts=[refs(ways[m.attrib['ref']]) for m in r.findall('member') if m.attrib.get('type')=='way' and m.attrib.get('role','') in ('outer','') and m.attrib['ref'] in ways]
 rings=[]
 while parts:
  ring=parts.pop(0)
  while ring and ring[0]!=ring[-1]:
   found=False
   for idx,part in enumerate(parts):
    if ring[-1]==part[0]:ring+=part[1:];parts.pop(idx);found=True;break
    if ring[-1]==part[-1]:ring+=part[-2::-1];parts.pop(idx);found=True;break
   if not found:break
  if len(ring)>3 and ring[0]==ring[-1]:rings.append(ring)
 for n,ring in enumerate(rings):elements.append({'type':'way','id':-(int(r.attrib['id'])*10+n),'tags':t,'geometry':geom(ring)})
landmarks=[]
for e in list(root.findall('node'))+list(root.findall('way')):
 t=tags(e);name=t.get('name:en',t.get('name',''))
 if not name or not (t.get('tourism') in ['attraction','museum'] or t.get('historic') or name in ['City Hall',"St Mary's Cathedral",'Masjid India']):continue
 if e.tag=='node':p={'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon'])}
 else:
  ps=geom(refs(e))
  if not ps:continue
  p={'lat':sum(p['lat'] for p in ps)/len(ps),'lon':sum(p['lon'] for p in ps)/len(ps)}
 if 3.148<=p['lat']<=3.160 and 101.690<=p['lon']<=101.704:landmarks.append({'id':int(e.attrib['id']),'type':e.tag,'name':name,**p})
source={'landmarks':landmarks,'version':0.6,'osm3s':{'timestamp_osm_base':datetime.datetime.now(datetime.timezone.utc).isoformat()},'bounds':[3.148,101.690,3.160,101.704],'source':'https://api.openstreetmap.org/api/0.6/map?bbox=101.690,3.148,101.704,3.160','elements':elements}
Path('public/game3d/osm/kuala-lumpur-source.json').write_text(json.dumps(source,separators=(',',':')))
print(json.dumps({'nodes':len(nodes),'ways':len(elements),'bytes':Path('public/game3d/osm/kuala-lumpur-source.json').stat().st_size}))
