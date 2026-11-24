"""Sculpt a separate mirror-only reference head and layered hairstyle.

Run with Blender --background --factory-startup --python this.py -- PROJECT.
The v2 .blend is a read-only starting point; only mirror-sculpted files are written.
"""
import sys
import math
from pathlib import Path
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

project = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.open_mainfile(filepath=str(project / 'assets/characters/mirror-reference.blend'))
collection = bpy.data.collections['Mirror export']
rig = bpy.data.objects['Mirror_MakeHuman_Rig']
outputs = [o for o in collection.objects if o.type == 'MESH' and not o.hide_render]
body = next(o for o in outputs if o.name == 'Body')
old_eyes = next(o for o in outputs if o.name == 'Eyes')
cap = next(o for o in outputs if o.name == 'Hair_swept')
morphs = [k.name for k in body.data.shape_keys.key_blocks if k.name != 'Basis']

def gauss(value, center, width):
    return math.exp(-((value-center)/width)**2)

def sculpt(point):
    """Local sculpt brushes, evaluated equally on the basis and every facial morph."""
    x, y, z = point
    if z < 1.54:
        return Vector(point)
    front = gauss(y, -.145, .075)
    # Lift/round the chin and shorten the long lower-face proportions.
    z += .007 * gauss(z, 1.607, .049)
    x *= 1 + .025 * gauss(z, 1.693, .055) * front
    # Two broad eye-opening brushes: grow lids with the eyeballs, retain almond corners.
    for side in (-1, 1):
        weight = gauss(x, side*.033, .027) * gauss(z, 1.7355, .023) * front
        z += (z-1.7355)*.45*weight
        x += (x-side*.033)*.15*weight
    # Softer bridge, shorter rounded nose, less projected tip.
    nose = gauss(x, 0, .019) * gauss(z, 1.699, .026) * front
    y += .005*nose
    z += .002*nose
    # Sculpt a gentle closed smile rather than a flat mouth; lift corners and cheeks.
    mouth = gauss(z, 1.658, .013) * front
    z += .0048 * gauss(abs(x), .026, .013) * mouth
    y -= .0016 * gauss(x, 0, .028) * mouth
    y -= .0025 * gauss(abs(x), .050, .025) * gauss(z, 1.693, .027) * front
    return Vector((x,y,z))

# The complete facial surface is sculpted; original UVs, topology and rig remain editable.
for obj in outputs:
    if obj.name.startswith('Hair_swept') or obj == old_eyes or obj.name.startswith('Eyebrows'):
        continue
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            for point in key.data:
                point.co = sculpt(point.co)
        for vertex, point in zip(obj.data.vertices, obj.data.shape_keys.key_blocks[0].data):
            vertex.co = point.co
    else:
        for vertex in obj.data.vertices:
            vertex.co = sculpt(vertex.co)
body['mirrorFaceProfile'] = 'custom-sculpt-v3'
body['sculptDetails'] = 'Rounded chin, cheek planes, almond lids, softened nose, lifted mouth corners'

def material(name, color, roughness=.6):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color,1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

# Smooth painted skin replaces the photograph's hard facial marks. Lip/cheek colour is
# an editable vertex-colour layer on the real head surface, not an overlaid face mask.
skin = material('Sculpted_Warm_Skin', (1,1,1), .66)
paint = skin.node_tree.nodes.new('ShaderNodeVertexColor')
paint.layer_name = 'SculptSkin'
skin.node_tree.links.new(paint.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value = .06
body.data.materials.clear(); body.data.materials.append(skin)
colors = body.data.color_attributes.new(name='SculptSkin', type='FLOAT_COLOR', domain='POINT')
for v in body.data.vertices:
    x,y,z = v.co
    front = gauss(y,-.16,.055)
    lip = gauss(x,0,.027)*gauss(z,1.6685,.0048)*front
    cheek = gauss(abs(x),.045,.023)*gauss(z,1.700,.022)*front
    nostril = gauss(abs(x),.011,.004)*gauss(z,1.692,.003)*front
    base = Vector((.62,.295,.173))
    base = base.lerp(Vector((.48,.177,.115)),min(.78,lip*.85))
    base = base.lerp(Vector((.64,.27,.165)),cheek*.17)
    base *= 1-.28*nostril
    colors.data[v.index].color = (*base,1)

def fit_keys(obj, source, transform=lambda p: Vector(p)):
    tree = KDTree(len(source.data.vertices))
    for v in source.data.vertices: tree.insert(v.co,v.index)
    tree.balance()
    indices = [tree.find(v.co)[1] for v in obj.data.vertices]
    obj.shape_key_add(name='Basis')
    for morph in morphs:
        key = obj.shape_key_add(name=morph)
        target = source.data.shape_keys.key_blocks[morph]
        for i,v in enumerate(obj.data.vertices):
            k=indices[i]
            delta = transform(target.data[k].co)-transform(source.data.vertices[k].co)
            key.data[i].co = v.co+delta

def finish(obj, role, source=None):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent=rig; obj['mirrorRole']=role
    group=obj.vertex_groups.new(name='head')
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    arm=obj.modifiers.new('Head skeleton','ARMATURE'); arm.object=rig
    for p in obj.data.polygons: p.use_smooth=True
    if source: fit_keys(obj,source)
    outputs.append(obj)
    return obj

def mesh_object(name, vertices, faces, mats):
    mesh=bpy.data.meshes.new(name+' editable mesh')
    mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); collection.objects.link(obj)
    for mat in mats: mesh.materials.append(mat)
    return obj

# Rebuilt round eyeballs with curved brown irises/pupils (not flat photo cards).
white=material('Sculpted_Eye_White',(.88,.86,.79),.27)
iris=material('Sculpted_Brown_Iris',(.12,.052,.018),.36)
iris_gold=material('Sculpted_Iris_Gold',(.23,.105,.032),.4)
pupil=material('Sculpted_Pupil',(.006,.004,.003),.2)
rim=material('Sculpted_Iris_Rim',(.034,.018,.009),.4)
for side in (-1,1):
    center=sculpt((side*.03265,-.135,1.7355))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=1,location=center)
    eye=bpy.context.object; eye.name='Eyes_Sculpted_'+('L' if side<0 else 'R')
    eye.scale=(.018,.016,.017)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    eye.data.materials.append(white)
    finish(eye,'eyes',old_eyes)
    vertices=[]; faces=[]
    # Small concentric rings follow the eyeball curvature and expose a warm iris.
    radii=[0,.0038,.0044,.0068,.0078]
    for r in radii:
        for i in range(48):
            angle=i*math.tau/48
            x=r*math.cos(angle); z=r*math.sin(angle)
            y=-.016*math.sqrt(max(0,1-(x/.018)**2-(z/.017)**2))-.00015
            vertices.append(center+Vector((x,y,z)))
    for ring in range(len(radii)-1):
        for i in range(48):
            faces.append((ring*48+i,ring*48+(i+1)%48,(ring+1)*48+(i+1)%48,(ring+1)*48+i))
    disc=mesh_object('Eyes_Iris_'+str(side),vertices,faces,[pupil,iris,iris_gold,rim])
    for poly in disc.data.polygons:
        ring=poly.index//48
        poly.material_index=0 if ring==0 else 3 if ring==3 else 2 if poly.index%7 in (0,1) else 1
    finish(disc,'eyes',old_eyes)
outputs.remove(old_eyes); old_eyes.hide_render=True; old_eyes.hide_set(True)
# The old photographic lash cards produce speckles around the larger sculpted lids.
old_lashes=next(o for o in outputs if o.name=='Eyelashes')
outputs.remove(old_lashes);old_lashes.hide_render=True;old_lashes.hide_set(True)

# New scalp shell with deliberately uneven hairline, temples, sideburns and nape.
# Latitude runs from the scalp crown to a continuous variable-height hairline.
hair_mats=[material('Sculpted_Chestnut_'+str(i),color,.55) for i,color in enumerate([
    (.075,.031,.014),(.105,.047,.022),(.135,.064,.031),(.089,.038,.018)])]
cx,cy,cz=0,-.012,1.766
rx,ry,rz=.091,.118,.106
def scalp(theta, latitude, extra=0):
    return Vector((cx+(rx+extra)*math.sin(latitude)*math.sin(theta),
                   cy-(ry+extra)*math.sin(latitude)*math.cos(theta),
                   cz+(rz+extra)*math.cos(latitude)))
def hairline(theta):
    front=(math.cos(theta)+1)/2
    return 2.27-.99*front + .075*math.sin(theta*3+.5)
verts=[]; faces=[]; segments=96; rows=22
for row in range(rows):
    t=row/(rows-1)
    for i in range(segments):
        theta=i*math.tau/segments
        lat=.008+(hairline(theta)-.008)*t
        p=scalp(theta,lat)
        # Interlocking low sculpted waves avoid a smooth helmet underneath the clumps.
        p+=Vector((p.x,p.y-cy,(p.z-cz)*.6)).normalized()*(.0025*math.sin(theta*11+lat*7)*math.sin(lat)**2)
        verts.append(p)
for row in range(rows-1):
    for i in range(segments):
        a=row*segments+i;b=row*segments+(i+1)%segments
        faces.append((a,b,b+segments,a+segments))
shell=mesh_object('Hair_swept',verts,faces,hair_mats)
for p in shell.data.polygons: p.material_index=0

# Multi-ring, flattened tapered clumps follow authored S curves; longitudinal grooves
# are actual surface geometry. Roots overlap, tips taper into neighbouring waves.
verts=[]; faces=[]; face_mats=[]
def strand(points,width,thickness,seed):
    points=[Vector(p) for p in points]; start=len(verts)
    def curve(t):
        segment=min(len(points)-2,int(t*(len(points)-1)))
        u=t*(len(points)-1)-segment
        a,b,c,d=[points[max(0,min(len(points)-1,k))] for k in (segment-1,segment,segment+1,segment+2)]
        return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
    rings=30;sides=16
    for i in range(rings):
        t=i/(rings-1); p=curve(t)
        tangent=(curve(min(1,t+.001))-curve(max(0,t-.001))).normalized()
        normal=Vector((p.x/(rx*rx),(p.y-cy)/(ry*ry),(p.z-cz)/(rz*rz))).normalized()
        side=tangent.cross(normal).normalized(); normal=side.cross(tangent).normalized()
        taper=(.36+.64*math.sin(math.pi*t)**.55)*(1-t**5*.94)
        for j in range(sides):
            a=j*math.tau/sides
            ridge=1+.07*math.cos(a*5+t*2+seed)
            verts.append(p+side*(math.cos(a)*width*taper)+normal*(math.sin(a)*thickness*taper*ridge))
    for i in range(rings-1):
        for j in range(sides):
            a=start+i*sides+j;b=start+i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
            face_mats.append((1 if j in (0,1,7,8,15) else 2 if j in (2,3,4) else 3) if seed%3 else (0 if j in (9,10,11) else 1))
    faces.append(tuple(start+j for j in reversed(range(sides))));face_mats.append(0)
    faces.append(tuple(start+(rings-1)*sides+j for j in range(sides)));face_mats.append(1)

# Front sweep: a low side part, broad rolling quiff and several shorter forehead curls.
for i in range(7):
    depth=-.121+i*.019
    lift=.006*math.sin(i*1.6)
    strand([(.061,depth+.022,1.801),(.044,depth,1.850+lift),
            (.007,depth-.008,1.879+lift),(-.032,depth-.002,1.866+lift),
            (-.064,depth+.005,1.846+lift),(-.092,depth+.013,1.850+lift)],.016,.009,i)
for i in range(4):
    shift=i*.013
    strand([(.058-shift,-.108,1.833),(.039-shift,-.136,1.834+i*.008),
            (.012-shift,-.143,1.818+i*.007),(-.013-shift,-.141,1.806+i*.007),
            (-.038-shift,-.130,1.792+i*.006)],.013,.007,10+i)
# Crown/back and both sides: staggered rows, swept in the same direction as the quiff.
for side in (-1,1):
    for row in range(3):
        for col in range(4):
            theta=side*(.80+col*.46)
            lat=.68+row*.38
            points=[scalp(theta-.28*side,lat-.20,.003),scalp(theta-.05*side,lat-.07,.008),
                    scalp(theta+.14*side,lat+.05,.009),scalp(theta+.28*side,lat+.20,.004),
                    scalp(theta+.43*side,lat+.25,.003)]
            strand(points,.0125-row*.001,.0065,20+row*4+col+(0 if side<0 else 12))
    # Temple/sideburn tips tucked close to the ears.
    strand([scalp(side*1.25,1.10,.003),scalp(side*1.33,1.30,.007),
            scalp(side*1.39,1.49,.004),scalp(side*1.44,1.65,.001)],.009,.005,50)
for i in range(5):
    theta=2.25+i*.34
    strand([scalp(theta,.42,.003),scalp(theta+.22,.62,.011),scalp(theta+.34,.82,.009),
            scalp(theta+.42,1.03,.005)],.015,.008,60+i)
locks=mesh_object('Hair_swept_Locks',verts,faces,hair_mats)
for p,i in zip(locks.data.polygons,face_mats):p.material_index=i
locks['mirrorHairProfile']='custom-layered-waves-v3'
locks['sculptDetails']='42 individually shaped clumps, tapered ends, sculpted longitudinal grooves'

# Fit new hair to every authored morph, then retire the previous crown and locks.
for old in list(outputs):
    if old.name.startswith('Hair_swept'):
        outputs.remove(old);old.hide_render=True;old.hide_set(True);old.name='Previous_'+old.name
shell.name='Hair_swept';locks.name='Hair_swept_Locks'
finish(shell,'hair',cap);finish(locks,'hair',cap)

# Tapered brows: flatter inner half, lifted outer arch, fine pointed ends.
source_brows=next(o for o in outputs if o.name=='Eyebrows_sculpted')
verts=[];faces=[];face_mats=[]
for side in (-1,1):
    strand([(side*.013,-.164,1.758),(side*.026,-.168,1.762),
            (side*.043,-.165,1.763),(side*.057,-.156,1.756),
            (side*.063,-.150,1.751)],.0048,.0026,70)
brows=mesh_object('SculptedBrows',verts,faces,[material('Sculpted_Brow',(.065,.026,.012),.8)])
# Place the relief on the actual sculpted forehead, including the side-view curvature.
from mathutils.bvhtree import BVHTree
face_surface=BVHTree.FromPolygons([v.co for v in body.data.vertices],
    [tuple(p.vertices) for p in body.data.polygons])
for vertex in brows.data.vertices:
    point,normal,index,distance=face_surface.ray_cast(Vector((vertex.co.x,-.4,vertex.co.z)),Vector((0,1,0)))
    if point:
        vertex.co.y=point.y-.0012
finish(brows,'hair',source_brows)
outputs.remove(source_brows);source_brows.hide_render=True;source_brows.hide_set(True)
source_brows.name='Previous_Eyebrows';brows.name='Eyebrows_sculpted'

for obj in outputs:
    obj.hide_set(False);obj.hide_render=False
    obj.data.update()
rig.hide_set(False)
bpy.ops.object.select_all(action='DESELECT')
for obj in outputs+[rig]: obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(project/'assets/characters/mirror-sculpted.blend'))
bpy.ops.export_scene.gltf(filepath=str(project/'public/game3d/mirror-sculpted.glb'),export_format='GLB',
    use_selection=True,export_apply=False,export_morph=True,export_morph_normal=True,
    export_skins=True,export_animations=False,export_extras=True,
    export_copyright='Custom H2H mirror sculpt; underlying MakeHuman Community topology, rig and clothing CC0 1.0.')
print('H2H_SCULPT_EXPORT',len(outputs),'parts',flush=True)
