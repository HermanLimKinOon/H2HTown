"""Build the mirror-only CC0 character with Blender 4.5 + MPFB 2.

Run Blender --background --factory-startup --python this.py -- 
  /path/to/mpfb2/src /path/to/extracted/system-assets /path/to/project
No game state or playable-character asset is read or written.
"""
import os
import sys
from pathlib import Path
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, assets, project = map(Path, args[:3])
reference = '--reference' in args
sys.path.insert(0, str(src))
workspace = Path('/private/tmp/h2h-mpfb-build')
workspace.mkdir(exist_ok=True)
bpy.utils.extension_path_user = lambda *args, **kwargs: str(workspace)
import mpfb
original_preference = mpfb.get_preference
mpfb.get_preference = lambda key: str(workspace) if key == 'mpfb_user_data' else str(assets) if key == 'mpfb_second_root' else original_preference(key)
bpy.context.preferences.addons.new().module = 'mpfb'
mpfb.register()
from mpfb.services.humanservice import HumanService
from mpfb.services.targetservice import TargetService
from mpfb.services.clothesservice import ClothesService

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.32, muscle=0.5, weight=0.45)
if reference:
    macro.update(age=0.45, height=0.65, muscle=0.55, weight=0.43)
macro['race'] = {'asian': 0.25, 'caucasian': 0.65, 'african': 0.1}
body = HumanService.create_human(macro_detail_dict=macro)
if reference:
    face_profile = [
        ('head/head-oval', .18), ('head/head-scale-horiz-incr', .12),
        ('chin/chin-bones-decr', .32), ('chin/chin-height-decr', .12),
        ('nose/nose-hump-decr', .28), ('nose/nose-scale-depth-decr', .20),
        ('nose/nose-scale-vert-decr', .18), ('nose/nose-point-width-incr', .12),
        ('mouth/mouth-angles-up', .65), ('mouth/mouth-scale-horiz-incr', .16),
        ('mouth/mouth-upperlip-volume-incr', .14), ('mouth/mouth-lowerlip-volume-incr', .10),
        ('cheek/l-cheek-volume-incr', .15), ('cheek/r-cheek-volume-incr', .15),
        ('eyes/l-eye-scale-incr', .34), ('eyes/r-eye-scale-incr', .34),
        ('eyes/l-eye-height1-incr', .18), ('eyes/r-eye-height1-incr', .18),
        ('eyebrows/eyebrows-trans-up', .18),
    ]
    for path, value in face_profile:
        TargetService.load_target(body, str(src / 'mpfb/data/targets' / (path + '.target.gz')), weight=value)
TargetService.bake_targets(body)
HumanService.set_character_skin(str(assets / 'skins/young_caucasian_male/young_caucasian_male.mhmat'), body, skin_type='GAMEENGINE')
rig = HumanService.add_builtin_rig(body, 'game_engine')
if rig is None:
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')

parts = [(body, 'Body', 'skin')]
def add(subdir, filename, name, kind, role):
    obj = HumanService.add_mhclo_asset(str(assets / subdir / filename / (filename + '.mhclo')), body,
        asset_type=kind, subdiv_levels=0, material_type='GAMEENGINE')
    parts.append((obj, name, role))
    return obj

add('eyes', 'low-poly', 'Eyes', 'Eyes', 'eyes')
add('eyebrows', 'eyebrow003' if reference else 'eyebrow001', 'Eyebrows', 'Eyebrows', 'hair')
add('eyelashes', 'eyelashes01', 'Eyelashes', 'Eyelashes', 'lashes')
add('teeth', 'teeth_base', 'Teeth', 'Teeth', 'teeth')
add('hair', 'short02', 'Hair_short', 'Hair', 'hair')
add('hair', 'bob01', 'Hair_bob', 'Hair', 'hair')
add('hair', 'afro01', 'Hair_curly', 'Hair', 'hair')
if reference:
    add('hair', 'short02', 'Hair_swept', 'Hair', 'hair')
add('clothes', 'male_casualsuit01', 'Outfit_casual', 'Clothes', 'outfit')
add('clothes', 'male_worksuit01', 'Outfit_work', 'Clothes', 'outfit')
reference_clothes = add('clothes', 'male_casualsuit04', 'Outfit_reference', 'Clothes', 'outfit') if reference else None
add('clothes', 'shoes05' if reference else 'shoes01', 'Shoes', 'Clothes', 'shoes')
shirt_vertices = set()
if reference:
    # The tee and jeans are disconnected components in this combined system asset.
    adjacency = [set() for _ in reference_clothes.data.vertices]
    for edge in reference_clothes.data.edges:
        a, b = edge.vertices
        adjacency[a].add(b); adjacency[b].add(a)
    pending = set(range(len(adjacency)))
    components = []
    while pending:
        todo = [pending.pop()]; component = set(todo)
        while todo:
            for neighbour in adjacency[todo.pop()]:
                if neighbour in pending:
                    pending.remove(neighbour); component.add(neighbour); todo.append(neighbour)
        components.append(component)
    shirt_vertices = max(components, key=lambda indices: max(reference_clothes.data.vertices[i].co.z for i in indices))

# The MakeHuman helpers are used for fitting, then excluded by evaluated masks.
# Keep the body so both modular outfits can be displayed. Hide only helper geometry.
for modifier in list(body.modifiers):
    if modifier.type == 'MASK' and modifier.vertex_group != 'body':
        body.modifiers.remove(modifier)

targets = {
 'faceWidth': ('head/head-scale-horiz-decr', 'head/head-scale-horiz-incr'),
 'jawWidth': ('chin/chin-bones-decr', 'chin/chin-bones-incr'),
 'noseWidth': ('nose/nose-scale-horiz-decr', 'nose/nose-scale-horiz-incr'),
 'eyeSpacing': (['eyes/l-eye-trans-in', 'eyes/r-eye-trans-in'], ['eyes/l-eye-trans-out', 'eyes/r-eye-trans-out']),
 'mouthWidth': ('mouth/mouth-scale-horiz-decr', 'mouth/mouth-scale-horiz-incr'),
 'chinHeight': ('chin/chin-height-decr', 'chin/chin-height-incr'),
 'noseLength': ('nose/nose-scale-depth-decr', 'nose/nose-scale-depth-incr'),
 'eyeSize': (['eyes/l-eye-scale-decr', 'eyes/r-eye-scale-decr'], ['eyes/l-eye-scale-incr', 'eyes/r-eye-scale-incr']),
 'cheekFullness': (['cheek/l-cheek-volume-decr', 'cheek/r-cheek-volume-decr'], ['cheek/l-cheek-volume-incr', 'cheek/r-cheek-volume-incr']),
 'browHeight': ('eyebrows/eyebrows-trans-down', 'eyebrows/eyebrows-trans-up'),
}
groups = {}
for control, pair in targets.items():
    for suffix, paths in zip(('Minus', 'Plus'), pair):
        keys = []
        for i, path in enumerate(paths if isinstance(paths, list) else [paths]):
            key = control + suffix + str(i)
            TargetService.load_target(body, str(src / 'mpfb/data/targets' / (path + '.target.gz')), name=key, weight=0)
            keys.append(key)
        groups[control + suffix] = keys

export_collection = bpy.data.collections.new('Mirror export')
bpy.context.scene.collection.children.link(export_collection)
outputs = []
def evaluated_mesh(obj):
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), preserve_all_data_layers=True, depsgraph=graph)
    if obj == reference_clothes:
        # Looser tee silhouette, applied identically to the basis and every fitted morph.
        for vertex in mesh.vertices:
            if vertex.index in shirt_vertices:
                weight = min(1, (vertex.co.z - .9) / .1)
                vertex.co.x *= 1 + .065 * weight
                vertex.co.y *= 1 + .09 * weight
        mesh.update()
    return mesh

for obj, name, role in parts:
    mesh = evaluated_mesh(obj)
    output = bpy.data.objects.new(name, mesh)
    export_collection.objects.link(output)
    output.matrix_world = obj.matrix_world.copy()
    output['mirrorRole'] = role
    if reference and name == 'Body':
        output['mirrorFaceProfile'] = 'reference-face-v2'
    # Preserve the game-engine weights on the evaluated mesh.
    for group in obj.vertex_groups:
        output.vertex_groups.new(name=group.name)
    output.parent = rig
    modifier = output.modifiers.new('Game engine skeleton', 'ARMATURE')
    modifier.object = rig
    output.shape_key_add(name='Basis')
    for material in mesh.materials:
        if material:
            # Stable per-part material names, independent from the MPFB library.
            cloned = material.copy()
            cloned.name = 'Mirror_' + role + '_' + name
            if role not in ('hair', 'lashes'):
                for node in cloned.node_tree.nodes:
                    if node.type == 'BSDF_PRINCIPLED':
                        for link in list(node.inputs['Alpha'].links):
                            cloned.node_tree.links.remove(link)
                        node.inputs['Alpha'].default_value = 1.0
            mesh.materials[mesh.materials[:].index(material)] = cloned
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    outputs.append(output)

for morph, keys in groups.items():
    for key in keys:
        body.data.shape_keys.key_blocks[key].value = 1
    for obj, _, _ in parts[1:]:
        ClothesService.fit_clothes_to_human(obj, body, set_parent=False)
    bpy.context.view_layer.update()
    for (obj, _, _), output in zip(parts, outputs):
        mesh = evaluated_mesh(obj)
        if len(mesh.vertices) != len(output.data.vertices):
            raise RuntimeError('Unstable morph topology for ' + output.name)
        key = output.shape_key_add(name=morph)
        coords = [0.0] * (len(mesh.vertices) * 3)
        mesh.vertices.foreach_get('co', coords)
        key.data.foreach_set('co', coords)
        bpy.data.meshes.remove(mesh)
    for key in keys:
        body.data.shape_keys.key_blocks[key].value = 0
    print('H2H_MORPH', morph, flush=True)

for obj, _, _ in parts[1:]:
    ClothesService.fit_clothes_to_human(obj, body, set_parent=False)

if reference:
    # Independent, replaceable shirt artwork. Keep the original jeans UVs/material.
    tee = next(obj for obj in outputs if obj.name == 'Outfit_reference')
    shirt = bpy.data.materials.new('Reference_Ivory_Tshirt')
    shirt.use_nodes = True
    bsdf = shirt.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.90, .87, .79, 1)
    bsdf.inputs['Roughness'].default_value = .9
    graphic = shirt.copy()
    graphic.name = 'Reference_Mountain_Graphic'
    tex = graphic.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(project / 'public/game3d/reference-mountain-shirt.png'))
    tex.extension = 'EXTEND'
    uv_node = graphic.node_tree.nodes.new('ShaderNodeUVMap')
    uv_node.uv_map = 'GraphicUV'
    graphic.node_tree.links.new(uv_node.outputs['UV'], tex.inputs['Vector'])
    graphic.node_tree.links.new(tex.outputs['Color'], graphic.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    uv = tee.data.uv_layers.new(name='GraphicUV')
    tee.data.materials.append(shirt)
    tee.data.materials.append(graphic)
    chest = max(v.co.z for v in tee.data.vertices) - .19
    for polygon in tee.data.polygons:
        if all(i in shirt_vertices for i in polygon.vertices):
            polygon.material_index = len(tee.data.materials) - (1 if polygon.normal.y < -.25 else 2)
        for loop_index in polygon.loop_indices:
            p = tee.data.vertices[tee.data.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = (.5 + p.x / .29, (p.z - chest + .145) / .29)

    # Sculpted swept locks over the fitted MakeHuman cap. Each is a tapered 3D ribbon.
    from mathutils import Vector
    from math import pi, sin, cos
    cap = next(obj for obj in outputs if obj.name == 'Hair_swept')
    top = max(v.co.z for v in cap.data.vertices)
    front = min(v.co.y for v in cap.data.vertices)
    from mathutils.kdtree import KDTree
    kd = KDTree(len(cap.data.vertices))
    for vertex in cap.data.vertices: kd.insert(vertex.co, vertex.index)
    kd.balance()
    def on_cap(point):
        return tuple(kd.find(Vector(point))[0])
    vertices, faces = [], []
    def lock(points, radius):
        start = len(vertices)
        points = [Vector(p) for p in points]
        def curve(t):
            if len(points) == 4:
                return (1-t)**3*points[0]+3*(1-t)**2*t*points[1]+3*(1-t)*t*t*points[2]+t**3*points[3]
            segment = min(len(points)-2, int(t*(len(points)-1)))
            u = t*(len(points)-1)-segment
            a,b,c,d = [points[max(0,min(len(points)-1,k))] for k in (segment-1,segment,segment+1,segment+2)]
            return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)
        for i in range(25):
            t = i / 24
            p = curve(t)
            tangent = (curve(min(1,t+.002))-curve(max(0,t-.002))).normalized()
            side = tangent.cross(Vector((0,1,0))).normalized()
            normal = side.cross(tangent).normalized()
            width = radius * (.15 + .85 * sin(pi * t)**.6)
            for j in range(10):
                a = j * 2*pi/10
                vertices.append(p + side*cos(a)*width + normal*sin(a)*width*.55)
        for i in range(24):
            for j in range(10):
                a=start+i*10+j; b=start+i*10+(j+1)%10
                faces.append((a,b,b+10,a+10))
        faces.append(tuple(start+j for j in reversed(range(10))))
        faces.append(tuple(start+240+j for j in range(10)))
    for i in range(6):
        depth = front + .025 + i*.017
        lift = sin(i*1.4)*.009
        lock([on_cap((.064,depth+.03,top-.085)),
              (.044,depth-.001,top-.035+lift),
              (.006,depth-.009,top+.010+lift),
              (-.040,depth+.004,top+.019+lift),
              (-.071,depth+.013,top+.004+lift),
              (-.093+i*.003,depth+.025,top+.005+lift)], .015+.0015*sin(i*1.7))
    for i in range(3):
        depth=front-.009+i*.009
        lock([on_cap((.045,depth+.035,top-.075)),
              (.020,depth-.008,top-.030+i*.008),
              (-.021,depth-.012,top-.043+i*.008),
              (-.058,depth-.002,top-.077+i*.006),
              on_cap((-.082,depth+.025,top-.10))], .0135)
    for i in range(3):
        depth=front+.12+i*.018
        lock([on_cap((.061,depth,top-.045)),
              (.019,depth-.012,top+.014),
              (-.027,depth+.006,top+.031+i*.003),
              (-.063,depth+.016,top+.019),
              (-.087,depth+.019,top+.010-i*.004)], .014)
    mesh = bpy.data.meshes.new('Swept sculpted hair locks')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    locks = bpy.data.objects.new('Hair_swept_Locks', mesh)
    export_collection.objects.link(locks)
    locks.parent = rig
    locks['mirrorRole'] = 'hair'
    locks['mirrorHairProfile'] = 'swept-waves-v2'
    group = locks.vertex_groups.new(name='head')
    group.add(list(range(len(vertices))), 1.0, 'REPLACE')
    modifier = locks.modifiers.new('Head skeleton', 'ARMATURE')
    modifier.object = rig
    for i, color in enumerate([(.22,.10,.045,1), (.15,.065,.028,1), (.27,.13,.060,1), (.24,.11,.050,1)]):
        material = bpy.data.materials.new('Reference_Sculpted_Brown_Hair_' + str(i))
        material.use_nodes = True
        material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = color
        material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .55
        mesh.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        band = polygon.index % 242 % 10
        polygon.material_index = 2 if band in (1,2) else 1 if band in (6,7) else 0 if band in (0,3,9) else 3
    # Match the fitted cap's morph displacement at the nearest surface vertex.
    nearest = [kd.find(vertex.co)[1] for vertex in mesh.vertices]
    locks.shape_key_add(name='Basis')
    for morph in groups:
        key = locks.shape_key_add(name=morph)
        cap_key = cap.data.shape_keys.key_blocks[morph]
        for i, vertex in enumerate(mesh.vertices):
            k = nearest[i]
            key.data[i].co = vertex.co + cap_key.data[k].co - cap.data.vertices[k].co
    outputs.append(locks)

    # A fitted crown under the locks prevents daylight gaps between overlapping waves.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1,
        location=(-.008, front+.10, top-.04))
    crown = bpy.context.object
    crown.name = 'Hair_swept_Volume'
    crown.scale = (.087, .080, .075)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for collection in list(crown.users_collection): collection.objects.unlink(crown)
    export_collection.objects.link(crown)
    crown.parent = rig; crown['mirrorRole'] = 'hair'
    group = crown.vertex_groups.new(name='head')
    group.add(list(range(len(crown.data.vertices))), 1, 'REPLACE')
    modifier = crown.modifiers.new('Head skeleton', 'ARMATURE'); modifier.object = rig
    crown.data.materials.append(locks.data.materials[0])
    for polygon in crown.data.polygons: polygon.use_smooth = True
    nearest = [kd.find(vertex.co)[1] for vertex in crown.data.vertices]
    crown.shape_key_add(name='Basis')
    for morph in groups:
        key = crown.shape_key_add(name=morph)
        cap_key = cap.data.shape_keys.key_blocks[morph]
        for i, vertex in enumerate(crown.data.vertices):
            k = nearest[i]
            key.data[i].co = vertex.co + cap_key.data[k].co - cap.data.vertices[k].co
    outputs.append(crown)

    # Solid, softly arched brows closer to the reference than the sparse photo cards.
    source_brows = next(obj for obj in outputs if obj.name == 'Eyebrows')
    vertices, faces = [], []
    for side in (-1, 1):
        points = [v.co for v in source_brows.data.vertices if v.co.x * side > 0]
        inner = min(abs(p.x) for p in points)
        outer = max(abs(p.x) for p in points)
        z = sum(p.z for p in points) / len(points)
        y = min(p.y for p in points) - .002
        span = outer-inner
        lock([(side*inner,y,z-.001), (side*(inner+span*.30),y-.002,z+.010),
              (side*(inner+span*.70),y,z+.008), (side*outer,y+.004,z-.005)], .0055)
    mesh = bpy.data.meshes.new('Sculpted eyebrow arches')
    mesh.from_pydata(vertices, [], faces); mesh.update()
    brows = bpy.data.objects.new('Eyebrows_sculpted', mesh)
    export_collection.objects.link(brows)
    brows.parent = rig; brows['mirrorRole'] = 'hair'
    group = brows.vertex_groups.new(name='head'); group.add(list(range(len(vertices))), 1, 'REPLACE')
    modifier = brows.modifiers.new('Head skeleton', 'ARMATURE'); modifier.object = rig
    material = bpy.data.materials.new('Reference_Sculpted_Brows')
    material.use_nodes = True
    material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.12,.050,.022,1)
    material.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .85
    mesh.materials.append(material)
    for polygon in mesh.polygons: polygon.use_smooth = True
    kd = KDTree(len(source_brows.data.vertices))
    for vertex in source_brows.data.vertices: kd.insert(vertex.co, vertex.index)
    kd.balance()
    nearest = [kd.find(v.co)[1] for v in mesh.vertices]
    brows.shape_key_add(name='Basis')
    for morph in groups:
        key = brows.shape_key_add(name=morph)
        source_key = source_brows.data.shape_keys.key_blocks[morph]
        for i, vertex in enumerate(mesh.vertices):
            k = nearest[i]
            key.data[i].co = vertex.co + source_key.data[k].co - source_brows.data.vertices[k].co
    outputs.remove(source_brows)
    source_brows.hide_set(True); source_brows.hide_render = True
    outputs.append(brows)

# Compact embedded textures, with original files left untouched.
for image in bpy.data.images:
    if image.source == 'FILE' and max(image.size) > 1024:
        ratio = 1024 / max(image.size)
        image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
for image in bpy.data.images:
    if image.source == 'FILE':
        image.pack()

for obj, _, _ in parts:
    obj.hide_set(True)
    obj.hide_render = True
rig.name = 'Mirror_MakeHuman_Rig'
bpy.ops.object.select_all(action='DESELECT')
for obj in outputs + [rig]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
source_path = project / ('assets/characters/mirror-reference.blend' if reference else 'assets/characters/mirror-mpfb.blend')
source_path.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
output_path = project / ('public/game3d/mirror-reference.glb' if reference else 'public/game3d/mirror-mpfb.glb')
bpy.ops.export_scene.gltf(filepath=str(output_path), export_format='GLB', use_selection=True,
    export_apply=False, export_morph=True, export_morph_normal=True, export_skins=True,
    export_animations=False, export_extras=True, export_copyright='MakeHuman Community core assets and targets, CC0 1.0. Built for the H2H mirror using Blender and MPFB.')
print('H2H_EXPORT', output_path, output_path.stat().st_size, flush=True)
